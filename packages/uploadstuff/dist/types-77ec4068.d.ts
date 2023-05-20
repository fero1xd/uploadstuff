import { NextApiRequest, NextApiResponse } from 'next';
import { NextRequest } from 'next/server';

declare const unsetMarker: "unsetMarker" & {
    __brand: "unsetMarker";
};
type UnsetMarker = typeof unsetMarker;
type Simplify<TType> = {
    [TKey in keyof TType]: TType[TKey];
} & {};
type MaybePromise<TType> = TType | Promise<TType>;
type AnyRuntime = "app" | "pages" | "web";
interface AnyParams {
    _metadata: any;
    _runtime: any;
}
type UploadedFile = {
    name: string;
    key: string;
    url: string;
};
type AllowedFiles = "image" | "video" | "audio" | "blob";
type SizeUnit = "B" | "KB" | "MB" | "GB";
type PowOf2 = 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024;
type FileSize = `${PowOf2}${SizeUnit}`;
type ResolverOptions<TParams extends AnyParams> = {
    metadata: Simplify<TParams["_metadata"] extends UnsetMarker ? undefined : TParams["_metadata"]>;
    file: UploadedFile;
};
type ReqMiddlewareFn<TOutput extends Record<string, unknown>> = (req: Request) => MaybePromise<TOutput>;
type NextReqMiddlewareFn<TOutput extends Record<string, unknown>> = (req: NextRequest) => MaybePromise<TOutput>;
type NextApiMiddlewareFn<TOutput extends Record<string, unknown>> = (req: NextApiRequest, res: NextApiResponse) => MaybePromise<TOutput>;
type MiddlewareFn<TOutput extends Record<string, unknown>, TRuntime extends string> = TRuntime extends "web" ? ReqMiddlewareFn<TOutput> : TRuntime extends "app" ? NextReqMiddlewareFn<TOutput> : NextApiMiddlewareFn<TOutput>;
type ResolverFn<TParams extends AnyParams> = (opts: ResolverOptions<TParams>) => MaybePromise<void>;
interface UploadBuilder<TParams extends AnyParams> {
    fileTypes: (types: AllowedFiles[]) => UploadBuilder<TParams>;
    maxSize: (size: FileSize) => UploadBuilder<TParams>;
    middleware: <TOutput extends Record<string, unknown>>(fn: MiddlewareFn<TOutput, TParams["_runtime"]>) => UploadBuilder<{
        _metadata: TOutput;
        _runtime: TParams["_runtime"];
    }>;
    onUploadComplete: (fn: ResolverFn<TParams>) => Uploader<TParams>;
}
type UploadBuilderDef<TRuntime extends AnyRuntime> = {
    fileTypes: AllowedFiles[];
    maxSize: FileSize;
    middleware: MiddlewareFn<{}, TRuntime>;
};
interface Uploader<TParams extends AnyParams> {
    _def: TParams & UploadBuilderDef<TParams["_runtime"]>;
    resolver: ResolverFn<TParams>;
}
type FileRouter<TParams extends AnyParams = AnyParams> = Record<string, Uploader<TParams>>;

export { AnyRuntime as A, FileRouter as F, MaybePromise as M, NextReqMiddlewareFn as N, ReqMiddlewareFn as R, SizeUnit as S, UploadBuilder as U, UnsetMarker as a, AnyParams as b, FileSize as c, NextApiMiddlewareFn as d, UploadBuilderDef as e, Uploader as f, unsetMarker as u };
