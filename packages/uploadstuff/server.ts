import { createBuilder } from "./src/upload-builder";
export * from "./src/types";

export const createUploadStuff = () => createBuilder<"web">();
