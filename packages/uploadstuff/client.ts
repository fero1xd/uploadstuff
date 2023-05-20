import type { FileRouter } from "./server";

const createRequestPermsUrl = (config: { url?: string; slug: string }) => {
  const queryParams = `?actionType=upload&slug=${config.slug}`;

  return `${config?.url ?? "/api/uploadstuff"}${queryParams}`;
};

export const DANGEROUS__uploadFiles = async <T extends string>(
  files: File[],
  endpoint: T,
  config?: {
    url?: string;
  }
) => {
  // Get presigned URL for S3 upload
  const s3ConnectionRes = await fetch(
    createRequestPermsUrl({ url: config?.url, slug: endpoint }),
    {
      method: "POST",
      body: JSON.stringify({
        files: files.map((f) => f.name),
      }),
    }
  ).then((res) => {
    // check for 200 response
    if (!res.ok) throw new Error("Failed to get presigned URLs");

    // attempt to parse response
    try {
      return res.json();
    } catch (e) {
      // response is not JSON
      console.error(e);
      throw new Error(`Failed to parse response as JSON. Got: ${res.body}`);
    }
  });

  if (!s3ConnectionRes || !Array.isArray(s3ConnectionRes))
    throw "No url received. How did you get here?";

  const fileUploadPromises = s3ConnectionRes.map(async (presigned: any) => {
    const file = files.find((f) => f.name === presigned.name);

    if (!file) {
      console.error("No file found for presigned URL", presigned);
      throw new Error("No file found for presigned URL");
    }
    const { url } = presigned.presignedUrl;

    // Do S3 upload
    const upload = await fetch(url, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (!upload.ok) throw new Error("Upload failed.");

    // Generate a URL for the uploaded image since AWS won't give me one
    const dom = url.split("?")[0].split("/").slice(0, 4).join("/");
    const genUrl = dom + "/" + encodeURIComponent(presigned.key);

    console.log("URL for uploaded image", genUrl);

    return {
      fileKey: presigned.key,
      fileUrl: genUrl,
    };
  });

  return Promise.all(fileUploadPromises) as Promise<
    { fileUrl: string; fileKey: string }[]
  >;
};

export type UploadFileType<T extends string> = typeof DANGEROUS__uploadFiles<T>;

export const genUploader = <
  TRouter extends FileRouter
>(): typeof DANGEROUS__uploadFiles<
  keyof TRouter extends string ? keyof TRouter : string
> => {
  return DANGEROUS__uploadFiles;
};

export const classNames = (...classes: string[]) => {
  return classes.filter(Boolean).join(" ");
};

export const generateMimeTypes = (fileTypes: string[]) => {
  return fileTypes.map((type) => `${type}/*`);
};

const fromEntries = (iterable: any) => {
  return [...iterable].reduce((obj, [key, val]) => {
    obj[key] = val;
    return obj;
  }, {});
};

export const generateClientDropzoneAccept = (fileTypes: string[]) => {
  const mimeTypes = generateMimeTypes(fileTypes);
  return fromEntries(mimeTypes.map((type) => [type, []]));
};
