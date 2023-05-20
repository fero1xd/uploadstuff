import { U as UploadBuilder } from './types-77ec4068.js';
export { b as AnyParams, A as AnyRuntime, F as FileRouter, c as FileSize, M as MaybePromise, d as NextApiMiddlewareFn, N as NextReqMiddlewareFn, R as ReqMiddlewareFn, S as SizeUnit, a as UnsetMarker, e as UploadBuilderDef, f as Uploader, u as unsetMarker } from './types-77ec4068.js';
import 'next';
import 'next/server';

declare const createUploadStuff: () => UploadBuilder<{
    _metadata: "unsetMarker" & {
        __brand: "unsetMarker";
    };
    _runtime: "web";
}>;

export { UploadBuilder, createUploadStuff };
