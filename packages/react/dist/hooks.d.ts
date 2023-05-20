import { FileRouter } from 'uploadstuff/server';
import { DANGEROUS__uploadFiles } from 'uploadstuff/client';

declare const generateReactHelpers: <TRouter extends FileRouter>() => {
    readonly useUploadStuff: ({ endpoint, onClientUploadComplete, onUploadError, }: {
        endpoint: keyof TRouter extends string ? keyof TRouter : string;
        onClientUploadComplete?: ((res?: Awaited<ReturnType<typeof DANGEROUS__uploadFiles>>) => void) | undefined;
        onUploadError?: ((e: Error) => void) | undefined;
    }) => {
        readonly startUpload: (files: File[]) => Promise<{
            fileUrl: string;
            fileKey: string;
        }[] | undefined>;
        readonly isUploading: boolean;
        readonly permittedFileInfo: {
            slug: string;
            maxSize: string;
            fileTypes: string[];
        } | undefined;
    };
    readonly uploadFiles: (files: File[], endpoint: keyof TRouter extends string ? keyof TRouter : string, config?: {
        url?: string | undefined;
    } | undefined) => Promise<{
        fileUrl: string;
        fileKey: string;
    }[]>;
};

export { generateReactHelpers };
