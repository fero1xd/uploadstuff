import * as react_jsx_runtime from 'react/jsx-runtime';
import { FileRouter } from 'uploadstuff/server';
import { DANGEROUS__uploadFiles } from 'uploadstuff/client';

type EndpointHelper<TRouter extends void | FileRouter> = void extends TRouter ? "YOU FORGOT TO PASS THE GENERIC" : keyof TRouter;
/**
 * @example
 * <UploadButton<OurFileRouter>
 *   endpoint="someEndpoint"
 *   onUploadComplete={(res) => console.log(res)}
 *   onUploadError={(err) => console.log(err)}
 * />
 */
declare function UploadButton<TRouter extends void | FileRouter = void>(props: {
    endpoint: EndpointHelper<TRouter>;
    multiple?: boolean;
    onClientUploadComplete?: (res?: Awaited<ReturnType<typeof DANGEROUS__uploadFiles>>) => void;
    onUploadError?: (error: Error) => void;
}): react_jsx_runtime.JSX.Element;
declare const UploadDropzone: <TRouter extends void | FileRouter = void>(props: {
    endpoint: EndpointHelper<TRouter>;
    onClientUploadComplete?: ((res?: Awaited<ReturnType<typeof DANGEROUS__uploadFiles>>) => void) | undefined;
    onUploadError?: ((error: Error) => void) | undefined;
}) => react_jsx_runtime.JSX.Element;

export { UploadButton, UploadDropzone };
