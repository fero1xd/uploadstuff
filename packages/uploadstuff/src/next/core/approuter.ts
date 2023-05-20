import {
  RouterWithConfig,
  buildPermissionsInfoHandler,
  buildRequestHandler,
} from "../../internal/handler";
import type { FileRouter } from "../../types";

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-member-access
const UPLOADSTUFF_VERSION = require("../../../package.json").version as string;

export const createNextRouteHandler = <TRouter extends FileRouter>(
  opts: RouterWithConfig<TRouter>
) => {
  if (!process.env.CUSTOM_UPLOADSTUFF_URL) {
    throw new Error("[US] No CUSTOM_UPLOAD_STUFF_URL provided in .env file");
  }

  const requestHandler = buildRequestHandler<TRouter, "app">(opts);

  const POST = async (req: Request) => {
    const params = new URL(req.url).searchParams;
    const uploadstuffHook = req.headers.get("uploadstuff-hook") ?? undefined;
    const slug = params.get("slug") ?? undefined;
    const actionType = params.get("actionType") ?? undefined;

    const response = await requestHandler({
      uploadstuffHook,
      slug,
      actionType,
      req,
    });
    if (response.status === 200) {
      return new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: {
          "x-uploadstuff-version": UPLOADSTUFF_VERSION,
        },
      });
    }

    return new Response(response.message ?? "Unable to upload file.", {
      status: response.status,
      headers: {
        "x-uploadstuff-version": UPLOADSTUFF_VERSION,
      },
    });
  };

  const getBuildPerms = buildPermissionsInfoHandler<TRouter>(opts);

  const GET = () => {
    return new Response(JSON.stringify(getBuildPerms()), {
      status: 200,
      headers: {
        "x-uploadstuff-version": UPLOADSTUFF_VERSION,
      },
    });
  };

  return { GET, POST };
};
