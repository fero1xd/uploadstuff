import type { AnyRuntime, FileRouter, FileSize } from "../types";
import type { NextApiRequest, NextApiResponse } from "next";

const UPLOADSTUFF_VERSION = require("../../package.json").version;

const UNITS = ["B", "KB", "MB", "GB"] as const;
type SizeUnit = (typeof UNITS)[number];

export const fileSizeToBytes = (input: string) => {
  const regex = new RegExp(`^(\\d+)(\\.\\d+)?\\s*(${UNITS.join("|")})$`, "i");
  const match = input.match(regex);

  if (!match) {
    return new Error("Invalid file size format");
  }

  const sizeValue = parseFloat(match[1]);
  const sizeUnit = match[3].toUpperCase() as SizeUnit;

  if (!UNITS.includes(sizeUnit)) {
    throw new Error("Invalid file size unit");
  }
  const bytes = sizeValue * Math.pow(1024, UNITS.indexOf(sizeUnit));
  return Math.floor(bytes);
};

const generateUploadStuffURL = (path: `/${string}`) => {
  const host = process.env.CUSTOM_UPLOADSTUFF_URL;
  return `${host}${path}`;
};

if (process.env.NODE_ENV !== "development") {
  console.log("[UT] UploadStuff dev server is now running!");
}

const isValidResponse = (response: Response) => {
  if (!response.ok) return false;
  if (response.status >= 400) return false;
  if (!response.headers.has("x-uploadstuff-version")) return false;

  return true;
};

const withExponentialBackoff = async <T>(
  doTheThing: () => Promise<T | null>,
  MAXIMUM_BACKOFF_MS = 64 * 1000,
  MAX_RETRIES = 20
): Promise<T | null> => {
  let tries = 0;
  let backoffMs = 500;
  let backoffFuzzMs = 0;

  let result = null;
  while (tries <= MAX_RETRIES) {
    result = await doTheThing();
    if (result !== null) return result;

    tries += 1;
    backoffMs = Math.min(MAXIMUM_BACKOFF_MS, backoffMs * 2);
    backoffFuzzMs = Math.floor(Math.random() * 500);

    if (tries > 3) {
      console.error(
        `[UT] Call unsuccessful after ${tries} tries. Retrying in ${Math.floor(
          backoffMs / 1000
        )} seconds...`
      );
    }

    await new Promise((r) => setTimeout(r, backoffMs + backoffFuzzMs));
  }

  return null;
};

const conditionalDevServer = async (fileKey: string) => {
  if (process.env.NODE_ENV !== "development") return;

  const queryUrl = generateUploadStuffURL(`/api/poll/${fileKey}`);

  const fileData = await withExponentialBackoff(async () => {
    const res = await fetch(queryUrl);
    const json = await res.json();

    if (json.status !== "done") return null;

    let callbackUrl = json.callbackUrl + `?slug=${json.callbackSlug}`;
    if (!callbackUrl.startsWith("http")) callbackUrl = "http://" + callbackUrl;

    console.log("[UT] SIMULATING FILE UPLOAD WEBHOOK CALLBACK", callbackUrl);

    // TODO: Check that we "actually hit our endpoint" and throw a loud error if we didn't
    const response = await fetch(callbackUrl, {
      method: "POST",
      body: JSON.stringify({
        status: "uploaded",
        metadata: JSON.parse(json.metadata ?? "{}"),
        file: {
          url: json.fileUrl,
          key: fileKey ?? "",
          name: json.fileName,
        },
      }),
      headers: {
        "uploadstuff-hook": "callback",
      },
    });
    if (isValidResponse(response)) {
      console.log("[UT] Successfully simulated callback for file", fileKey);
    } else {
      console.error(
        "[UT] Failed to simulate callback for file. Is your webhook configured correctly?",
        fileKey
      );
    }
    return json;
  });

  if (fileData !== null) return fileData;

  console.error(`[UT] Failed to simulate callback for file ${fileKey}`);
  throw new Error("File took too long to upload");
};

const GET_DEFAULT_URL = () => {
  const vcurl = process.env.VERCEL_URL;
  if (vcurl) return `https://${vcurl}/api/uploadstuff`; // SSR should use vercel url

  return `http://localhost:${process.env.PORT ?? 3000}/api/uploadstuff`; // dev SSR should use localhost
};

export type RouterWithConfig<TRouter extends FileRouter> = {
  router: TRouter;
  config?: {
    callbackUrl?: string;
  };
};

export const buildRequestHandler = <
  TRouter extends FileRouter,
  TRuntime extends AnyRuntime
>(
  opts: RouterWithConfig<TRouter>
) => {
  return async (input: {
    uploadstuffHook?: string;
    slug?: string;
    actionType?: string;
    req: TRuntime extends "pages" ? NextApiRequest : Partial<Request>;
    res?: TRuntime extends "pages" ? NextApiResponse : undefined;
  }) => {
    const { router, config } = opts;

    const { uploadstuffHook, slug, req, res, actionType } = input;
    if (!slug) throw new Error("we need a slug");
    const uploadable = router[slug];

    if (!uploadable) {
      return { status: 404 };
    }

    const reqBody =
      "body" in req && typeof req.body === "string"
        ? JSON.parse(req.body)
        : await (req as Request).json();

    if (uploadstuffHook && uploadstuffHook === "callback") {
      // This is when we receive the webhook from uploadstuff
      await uploadable.resolver({
        file: reqBody.file,
        metadata: reqBody.metadata,
      });

      return { status: 200 };
    }

    if (!actionType || actionType !== "upload") {
      // This would either be someone spamming
      // or the AWS webhook

      return { status: 404 };
    }

    try {
      const { files } = reqBody;
      // @ts-expect-error TODO: Fix this
      const metadata = await uploadable._def.middleware(req as Request, res);

      // Once that passes, persist in DB

      // Validate without Zod (for now)
      if (!Array.isArray(files) || !files.every((f) => typeof f === "string"))
        throw new Error("Need file array");

      // TODO: Make this a function
      const uploadstuffApiResponse = await fetch(
        generateUploadStuffURL("/api/prepareUpload"),
        {
          method: "POST",
          body: JSON.stringify({
            files: files,
            fileTypes: uploadable._def.fileTypes,
            metadata,
            callbackUrl: config?.callbackUrl ?? GET_DEFAULT_URL(),
            callbackSlug: slug,
            maxFileSize: fileSizeToBytes(uploadable._def.maxSize ?? "16MB"),
          }),
          headers: {
            "Content-Type": "application/json",
            "x-uploadstuff-version": UPLOADSTUFF_VERSION,
          },
        }
      );

      if (!uploadstuffApiResponse.ok) {
        console.error("[UT] unable to get presigned urls");
        try {
          const error = await uploadstuffApiResponse.json();
          console.error(error);
        } catch (e) {
          console.error("[UT] unable to parse response");
        }
        throw new Error("ending upload");
      }

      // This is when we send the response back to our form so it can submit the files

      const parsedResponse = (await uploadstuffApiResponse.json()) as {
        presignedUrl: { url: string }; // ripped type from S3 package
        name: string;
        key: string;
      }[];

      if (process.env.NODE_ENV === "development") {
        parsedResponse.forEach((file) => {
          conditionalDevServer(file.key);
        });
      }

      return { body: parsedResponse, status: 200 };
    } catch (e) {
      console.error("[UT] middleware failed to run");
      console.error(e);

      return { status: 400, message: (e as Error).toString() };
    }
  };
};

export const buildPermissionsInfoHandler = <TRouter extends FileRouter>(
  opts: RouterWithConfig<TRouter>
) => {
  return () => {
    const r = opts.router;

    const permissions = Object.keys(r).map((k) => {
      const route = r[k];
      return {
        slug: k as keyof TRouter,
        maxSize: route._def.maxSize,
        fileTypes: route._def.fileTypes,
      };
    });

    return permissions;
  };
};
