import { F as FileRouter } from './types-77ec4068.js';
import 'next';
import 'next/server';

declare const DANGEROUS__uploadFiles: <T extends string>(files: File[], endpoint: T, config?: {
    url?: string;
}) => Promise<{
    fileUrl: string;
    fileKey: string;
}[]>;
type UploadFileType<T extends string> = typeof DANGEROUS__uploadFiles<T>;
declare const genUploader: <TRouter extends FileRouter>() => (files: File[], endpoint: keyof TRouter extends string ? keyof TRouter : string, config?: {
    url?: string;
}) => Promise<{
    fileUrl: string;
    fileKey: string;
}[]>;
declare const classNames: (...classes: string[]) => string;
declare const generateMimeTypes: (fileTypes: string[]) => string[];
declare const generateClientDropzoneAccept: (fileTypes: string[]) => any;

export { DANGEROUS__uploadFiles, UploadFileType, classNames, genUploader, generateClientDropzoneAccept, generateMimeTypes };
