import { F as FileRouter, U as UploadBuilder } from './types-77ec4068.js';
import 'next';
import 'next/server';

type RouterWithConfig<TRouter extends FileRouter> = {
    router: TRouter;
    config?: {
        callbackUrl?: string;
    };
};

declare const createNextRouteHandler: <TRouter extends FileRouter>(opts: RouterWithConfig<TRouter>) => {
    GET: () => Response;
    POST: (req: Request) => Promise<Response>;
};

declare const createUploadStuff: () => UploadBuilder<{
    _metadata: "unsetMarker" & {
        __brand: "unsetMarker";
    };
    _runtime: "app";
}>;

export { FileRouter, createNextRouteHandler, createUploadStuff };
