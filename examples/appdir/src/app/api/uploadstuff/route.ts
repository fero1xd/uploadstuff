import { ourFileRouter } from "../../_uploadstuff";
import { createNextRouteHandler } from "uploadstuff/next";

export const { GET, POST } = createNextRouteHandler({
  router: ourFileRouter,
});
