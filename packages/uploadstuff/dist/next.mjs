var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// package.json
var require_package = __commonJS({
  "package.json"(exports, module) {
    module.exports = {
      name: "uploadstuff",
      version: "0.0.1",
      exports: {
        "./package.json": "./package.json",
        "./client": {
          import: "./dist/client.mjs",
          types: "./dist/client.d.ts"
        },
        "./server": {
          import: "./dist/server.mjs",
          types: "./dist/server.d.ts",
          default: "./dist/server.mjs"
        },
        "./next": {
          import: "./dist/next.mjs",
          types: "./dist/next.d.ts"
        }
      },
      files: [
        "dist"
      ],
      typesVersions: {
        "*": {
          "*": [
            "dist/*"
          ]
        }
      },
      scripts: {
        build: "tsup",
        "build:dev": "tsup --watch",
        typecheck: "",
        lint: "eslint *.ts* --max-warnings 0"
      },
      keywords: [],
      author: "",
      license: "ISC",
      dependencies: {
        next: "^13.4.3"
      },
      publishConfig: {
        access: "public"
      },
      devDependencies: {
        "@types/node": "^20.2.1",
        eslint: "^7.32.0",
        tsup: "^6.7.0"
      }
    };
  }
});

// src/internal/handler.ts
var UPLOADSTUFF_VERSION = require_package().version;
var UNITS = ["B", "KB", "MB", "GB"];
var fileSizeToBytes = (input) => {
  const regex = new RegExp(`^(\\d+)(\\.\\d+)?\\s*(${UNITS.join("|")})$`, "i");
  const match = input.match(regex);
  if (!match) {
    return new Error("Invalid file size format");
  }
  const sizeValue = parseFloat(match[1]);
  const sizeUnit = match[3].toUpperCase();
  if (!UNITS.includes(sizeUnit)) {
    throw new Error("Invalid file size unit");
  }
  const bytes = sizeValue * Math.pow(1024, UNITS.indexOf(sizeUnit));
  return Math.floor(bytes);
};
var generateUploadStuffURL = (path) => {
  const host = process.env.CUSTOM_UPLOADSTUFF_URL;
  return `${host}${path}`;
};
if (process.env.NODE_ENV !== "development") {
  console.log("[UT] UploadStuff dev server is now running!");
}
var isValidResponse = (response) => {
  if (!response.ok)
    return false;
  if (response.status >= 400)
    return false;
  if (!response.headers.has("x-uploadstuff-version"))
    return false;
  return true;
};
var withExponentialBackoff = async (doTheThing, MAXIMUM_BACKOFF_MS = 64 * 1e3, MAX_RETRIES = 20) => {
  let tries = 0;
  let backoffMs = 500;
  let backoffFuzzMs = 0;
  let result = null;
  while (tries <= MAX_RETRIES) {
    result = await doTheThing();
    if (result !== null)
      return result;
    tries += 1;
    backoffMs = Math.min(MAXIMUM_BACKOFF_MS, backoffMs * 2);
    backoffFuzzMs = Math.floor(Math.random() * 500);
    if (tries > 3) {
      console.error(
        `[UT] Call unsuccessful after ${tries} tries. Retrying in ${Math.floor(
          backoffMs / 1e3
        )} seconds...`
      );
    }
    await new Promise((r) => setTimeout(r, backoffMs + backoffFuzzMs));
  }
  return null;
};
var conditionalDevServer = async (fileKey) => {
  if (process.env.NODE_ENV !== "development")
    return;
  const queryUrl = generateUploadStuffURL(`/api/poll/${fileKey}`);
  const fileData = await withExponentialBackoff(async () => {
    const res = await fetch(queryUrl);
    const json = await res.json();
    if (json.status !== "done")
      return null;
    let callbackUrl = json.callbackUrl + `?slug=${json.callbackSlug}`;
    if (!callbackUrl.startsWith("http"))
      callbackUrl = "http://" + callbackUrl;
    console.log("[UT] SIMULATING FILE UPLOAD WEBHOOK CALLBACK", callbackUrl);
    const response = await fetch(callbackUrl, {
      method: "POST",
      body: JSON.stringify({
        status: "uploaded",
        metadata: JSON.parse(json.metadata ?? "{}"),
        file: {
          url: json.fileUrl,
          key: fileKey ?? "",
          name: json.fileName
        }
      }),
      headers: {
        "uploadstuff-hook": "callback"
      }
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
  if (fileData !== null)
    return fileData;
  console.error(`[UT] Failed to simulate callback for file ${fileKey}`);
  throw new Error("File took too long to upload");
};
var GET_DEFAULT_URL = () => {
  const vcurl = process.env.VERCEL_URL;
  if (vcurl)
    return `https://${vcurl}/api/uploadstuff`;
  return `http://localhost:${process.env.PORT ?? 3e3}/api/uploadstuff`;
};
var buildRequestHandler = (opts) => {
  return async (input) => {
    const { router, config } = opts;
    const { uploadstuffHook, slug, req, res, actionType } = input;
    if (!slug)
      throw new Error("we need a slug");
    const uploadable = router[slug];
    if (!uploadable) {
      return { status: 404 };
    }
    const reqBody = "body" in req && typeof req.body === "string" ? JSON.parse(req.body) : await req.json();
    if (uploadstuffHook && uploadstuffHook === "callback") {
      await uploadable.resolver({
        file: reqBody.file,
        metadata: reqBody.metadata
      });
      return { status: 200 };
    }
    if (!actionType || actionType !== "upload") {
      return { status: 404 };
    }
    try {
      const { files } = reqBody;
      const metadata = await uploadable._def.middleware(req, res);
      if (!Array.isArray(files) || !files.every((f) => typeof f === "string"))
        throw new Error("Need file array");
      const uploadstuffApiResponse = await fetch(
        generateUploadStuffURL("/api/prepareUpload"),
        {
          method: "POST",
          body: JSON.stringify({
            files,
            fileTypes: uploadable._def.fileTypes,
            metadata,
            callbackUrl: (config == null ? void 0 : config.callbackUrl) ?? GET_DEFAULT_URL(),
            callbackSlug: slug,
            maxFileSize: fileSizeToBytes(uploadable._def.maxSize ?? "16MB")
          }),
          headers: {
            "Content-Type": "application/json",
            "x-uploadstuff-version": UPLOADSTUFF_VERSION
          }
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
      const parsedResponse = await uploadstuffApiResponse.json();
      if (process.env.NODE_ENV === "development") {
        parsedResponse.forEach((file) => {
          conditionalDevServer(file.key);
        });
      }
      return { body: parsedResponse, status: 200 };
    } catch (e) {
      console.error("[UT] middleware failed to run");
      console.error(e);
      return { status: 400, message: e.toString() };
    }
  };
};
var buildPermissionsInfoHandler = (opts) => {
  return () => {
    const r = opts.router;
    const permissions = Object.keys(r).map((k) => {
      const route = r[k];
      return {
        slug: k,
        maxSize: route._def.maxSize,
        fileTypes: route._def.fileTypes
      };
    });
    return permissions;
  };
};

// src/next/core/approuter.ts
var UPLOADSTUFF_VERSION2 = require_package().version;
var createNextRouteHandler = (opts) => {
  if (!process.env.CUSTOM_UPLOADSTUFF_URL) {
    throw new Error("[US] No CUSTOM_UPLOAD_STUFF_URL provided in .env file");
  }
  const requestHandler = buildRequestHandler(opts);
  const POST = async (req) => {
    const params = new URL(req.url).searchParams;
    const uploadstuffHook = req.headers.get("uploadstuff-hook") ?? void 0;
    const slug = params.get("slug") ?? void 0;
    const actionType = params.get("actionType") ?? void 0;
    const response = await requestHandler({
      uploadstuffHook,
      slug,
      actionType,
      req
    });
    if (response.status === 200) {
      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: {
          "x-uploadstuff-version": UPLOADSTUFF_VERSION2
        }
      });
    }
    return new Response(response.message ?? "Unable to upload file.", {
      status: response.status,
      headers: {
        "x-uploadstuff-version": UPLOADSTUFF_VERSION2
      }
    });
  };
  const getBuildPerms = buildPermissionsInfoHandler(opts);
  const GET = () => {
    return new Response(JSON.stringify(getBuildPerms()), {
      status: 200,
      headers: {
        "x-uploadstuff-version": UPLOADSTUFF_VERSION2
      }
    });
  };
  return { GET, POST };
};

// src/upload-builder.ts
function createBuilder(initDef = {}) {
  const _def = {
    fileTypes: ["image"],
    maxSize: "1MB",
    // @ts-expect-error - huh?
    middleware: () => ({}),
    ...initDef
  };
  return {
    fileTypes(types) {
      return createBuilder({
        ..._def,
        fileTypes: types
      });
    },
    maxSize(size) {
      return createBuilder({
        ..._def,
        maxSize: size
      });
    },
    middleware(resolver) {
      return createBuilder({
        ..._def,
        middleware: resolver
      });
    },
    onUploadComplete(resolver) {
      return {
        _def,
        resolver
      };
    }
  };
}

// next.ts
var createUploadStuff = () => createBuilder();
export {
  createNextRouteHandler,
  createUploadStuff
};
//# sourceMappingURL=next.mjs.map