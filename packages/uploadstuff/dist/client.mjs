// client.ts
var createRequestPermsUrl = (config) => {
  const queryParams = `?actionType=upload&slug=${config.slug}`;
  return `${(config == null ? void 0 : config.url) ?? "/api/uploadstuff"}${queryParams}`;
};
var DANGEROUS__uploadFiles = async (files, endpoint, config) => {
  const s3ConnectionRes = await fetch(
    createRequestPermsUrl({ url: config == null ? void 0 : config.url, slug: endpoint }),
    {
      method: "POST",
      body: JSON.stringify({
        files: files.map((f) => f.name)
      })
    }
  ).then((res) => {
    if (!res.ok)
      throw new Error("Failed to get presigned URLs");
    try {
      return res.json();
    } catch (e) {
      console.error(e);
      throw new Error(`Failed to parse response as JSON. Got: ${res.body}`);
    }
  });
  if (!s3ConnectionRes || !Array.isArray(s3ConnectionRes))
    throw "No url received. How did you get here?";
  const fileUploadPromises = s3ConnectionRes.map(async (presigned) => {
    const file = files.find((f) => f.name === presigned.name);
    if (!file) {
      console.error("No file found for presigned URL", presigned);
      throw new Error("No file found for presigned URL");
    }
    const { url } = presigned.presignedUrl;
    const upload = await fetch(url, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
    if (!upload.ok)
      throw new Error("Upload failed.");
    const dom = url.split("?")[0].split("/").slice(0, 4).join("/");
    const genUrl = dom + "/" + encodeURIComponent(presigned.key);
    console.log("URL for uploaded image", genUrl);
    return {
      fileKey: presigned.key,
      fileUrl: genUrl
    };
  });
  return Promise.all(fileUploadPromises);
};
var genUploader = () => {
  return DANGEROUS__uploadFiles;
};
var classNames = (...classes) => {
  return classes.filter(Boolean).join(" ");
};
var generateMimeTypes = (fileTypes) => {
  return fileTypes.map((type) => `${type}/*`);
};
var fromEntries = (iterable) => {
  return [...iterable].reduce((obj, [key, val]) => {
    obj[key] = val;
    return obj;
  }, {});
};
var generateClientDropzoneAccept = (fileTypes) => {
  const mimeTypes = generateMimeTypes(fileTypes);
  return fromEntries(mimeTypes.map((type) => [type, []]));
};
export {
  DANGEROUS__uploadFiles,
  classNames,
  genUploader,
  generateClientDropzoneAccept,
  generateMimeTypes
};
//# sourceMappingURL=client.mjs.map