"use client";

// src/component.tsx
import { useCallback, useState as useState2 } from "react";
import { useDropzone } from "react-dropzone";

// ../uploadstuff/dist/client.mjs
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

// src/useUploadStuff.ts
import { useState } from "react";

// src/utils/useEvent.ts
import React from "react";
var useInsertionEffect = typeof window !== "undefined" ? (
  // useInsertionEffect is available in React 18+
  React.useInsertionEffect || React.useLayoutEffect
) : () => {
};
function useEvent(callback) {
  const latestRef = React.useRef(
    useEvent_shouldNotBeInvokedBeforeMount
  );
  useInsertionEffect(() => {
    latestRef.current = callback;
  }, [callback]);
  const stableRef = React.useRef(null);
  if (!stableRef.current) {
    stableRef.current = function() {
      return latestRef.current.apply(this, arguments);
    };
  }
  return stableRef.current;
}
function useEvent_shouldNotBeInvokedBeforeMount() {
  throw new Error(
    "INVALID_USEEVENT_INVOCATION: the callback from useEvent cannot be invoked before the component has mounted."
  );
}

// src/utils/useFetch.ts
import { useEffect, useReducer, useRef } from "react";
function useFetch(url, options) {
  const cache = useRef({});
  const cancelRequest = useRef(false);
  const initialState = {
    error: void 0,
    data: void 0
  };
  const fetchReducer = (state2, action) => {
    switch (action.type) {
      case "loading":
        return { ...initialState };
      case "fetched":
        return { ...initialState, data: action.payload };
      case "error":
        return { ...initialState, error: action.payload };
      default:
        return state2;
    }
  };
  const [state, dispatch] = useReducer(fetchReducer, initialState);
  useEffect(() => {
    if (!url)
      return;
    cancelRequest.current = false;
    const fetchData = async () => {
      dispatch({ type: "loading" });
      if (cache.current[url]) {
        dispatch({ type: "fetched", payload: cache.current[url] });
        return;
      }
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        const data = await response.json();
        cache.current[url] = data;
        if (cancelRequest.current)
          return;
        dispatch({ type: "fetched", payload: data });
      } catch (error) {
        if (cancelRequest.current)
          return;
        dispatch({ type: "error", payload: error });
      }
    };
    void fetchData();
    return () => {
      cancelRequest.current = true;
    };
  }, [url]);
  return state;
}
var useFetch_default = useFetch;

// src/useUploadStuff.ts
var useEndpointMetadata = (endpoint) => {
  const { data } = useFetch_default("/api/uploadstuff");
  return data == null ? void 0 : data.find((x) => x.slug === endpoint);
};
var useUploadStuff = ({
  endpoint,
  onClientUploadComplete,
  onUploadError
}) => {
  const [isUploading, setUploading] = useState(false);
  const permittedFileInfo = useEndpointMetadata(endpoint);
  const startUpload = useEvent(async (files) => {
    setUploading(true);
    try {
      const res = await DANGEROUS__uploadFiles(files, endpoint);
      setUploading(false);
      onClientUploadComplete == null ? void 0 : onClientUploadComplete(res);
      return res;
    } catch (e) {
      setUploading(false);
      onUploadError == null ? void 0 : onUploadError(e);
      return;
    }
  });
  return {
    startUpload,
    isUploading,
    permittedFileInfo
  };
};

// src/component.tsx
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
function UploadButton(props) {
  const { startUpload, isUploading, permittedFileInfo } = useUploadStuff({
    endpoint: props.endpoint,
    onClientUploadComplete: props.onClientUploadComplete,
    onUploadError: props.onUploadError
  });
  const { maxSize, fileTypes } = permittedFileInfo ?? {};
  return /* @__PURE__ */ jsxs("div", { className: "ut-flex ut-flex-col ut-gap-1 ut-items-center ut-justify-center", children: [
    /* @__PURE__ */ jsxs("label", { className: "ut-bg-blue-600 ut-rounded-md ut-w-36 ut-h-10 ut-flex ut-items-center ut-justify-center ut-cursor-pointer", children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          className: "ut-hidden",
          type: "file",
          multiple: props.multiple,
          accept: generateMimeTypes(fileTypes ?? []).join(", "),
          onChange: (e) => {
            e.target.files && startUpload(Array.from(e.target.files));
          }
        }
      ),
      /* @__PURE__ */ jsx("span", { className: "ut-px-3 ut-py-2 ut-text-white", children: isUploading ? /* @__PURE__ */ jsx(Spinner, {}) : `Choose File${props.multiple ? `(s)` : ``}` })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "ut-h-[1.25rem]", children: fileTypes && /* @__PURE__ */ jsxs("p", { className: "ut-text-xs ut-leading-5 ut-text-gray-600", children: [
      `${fileTypes.join(", ")}`,
      " ",
      maxSize && `up to ${maxSize}`
    ] }) })
  ] });
}
var Spinner = () => {
  return /* @__PURE__ */ jsx(
    "svg",
    {
      className: "ut-animate-spin ut-h-5 ut-w-5 ut-text-white",
      xmlns: "http://www.w3.org/2000/svg",
      fill: "none",
      viewBox: "0 0 576 512",
      children: /* @__PURE__ */ jsx(
        "path",
        {
          fill: "currentColor",
          d: "M256 32C256 14.33 270.3 0 288 0C429.4 0 544 114.6 544 256C544 302.6 531.5 346.4 509.7 384C500.9 399.3 481.3 404.6 465.1 395.7C450.7 386.9 445.5 367.3 454.3 351.1C470.6 323.8 480 291 480 255.1C480 149.1 394 63.1 288 63.1C270.3 63.1 256 49.67 256 31.1V32z"
        }
      )
    }
  );
};
var UploadDropzone = (props) => {
  const { startUpload, isUploading, permittedFileInfo } = useUploadStuff({
    endpoint: props.endpoint,
    onClientUploadComplete: props.onClientUploadComplete,
    onUploadError: props.onUploadError
  });
  const [files, setFiles] = useState2([]);
  const onDrop = useCallback((acceptedFiles) => {
    setFiles(acceptedFiles);
  }, []);
  const { maxSize, fileTypes } = permittedFileInfo ?? {};
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: fileTypes ? generateClientDropzoneAccept(fileTypes) : void 0
  });
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: classNames(
        "ut-mt-2 ut-flex ut-justify-center ut-rounded-lg ut-border ut-border-dashed ut-border-gray-900/25 ut-px-6 ut-py-10",
        isDragActive ? "ut-bg-blue-600/10" : ""
      ),
      children: /* @__PURE__ */ jsxs("div", { className: "text-center", ...getRootProps(), children: [
        /* @__PURE__ */ jsx(
          "svg",
          {
            xmlns: "http://www.w3.org/2000/svg",
            viewBox: "0 0 20 20",
            className: "ut-mx-auto ut-h-12 ut-w-12 ut-text-gray-400",
            children: /* @__PURE__ */ jsx(
              "path",
              {
                fill: "currentColor",
                fillRule: "evenodd",
                d: "M5.5 17a4.5 4.5 0 0 1-1.44-8.765a4.5 4.5 0 0 1 8.302-3.046a3.5 3.5 0 0 1 4.504 4.272A4 4 0 0 1 15 17H5.5Zm3.75-2.75a.75.75 0 0 0 1.5 0V9.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0l-3.25 3.5a.75.75 0 1 0 1.1 1.02l1.95-2.1v4.59Z",
                clipRule: "evenodd"
              }
            )
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "ut-mt-4 ut-flex ut-text-sm ut-leading-6 ut-text-gray-600", children: [
          /* @__PURE__ */ jsxs(
            "label",
            {
              htmlFor: "file-upload",
              className: "ut-relative ut-cursor-pointer ut-font-semibold ut-text-blue-600 focus-within:ut-outline-none focus-within:ut-ring-2 focus-within:ut-ring-blue-600 focus-within:ut-ring-offset-2 hover:ut-text-blue-500",
              children: [
                `Choose files`,
                /* @__PURE__ */ jsx("input", { className: "ut-sr-only", ...getInputProps() })
              ]
            }
          ),
          /* @__PURE__ */ jsx("p", { className: "ut-pl-1", children: `or drag and drop` })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "ut-h-[1.25rem]", children: fileTypes && /* @__PURE__ */ jsxs("p", { className: "ut-text-xs ut-leading-5 ut-text-gray-600", children: [
          `${fileTypes.join(", ")}`,
          " ",
          maxSize && `up to ${maxSize}`
        ] }) }),
        files.length > 0 && /* @__PURE__ */ jsx("div", { className: "ut-mt-4 ut-flex ut-items-center ut-justify-center", children: /* @__PURE__ */ jsx(
          "button",
          {
            className: "ut-bg-blue-600 ut-rounded-md ut-w-36 ut-h-10 ut-flex ut-items-center ut-justify-center",
            onClick: (e) => {
              e.preventDefault();
              e.stopPropagation();
              startUpload(files);
            },
            children: /* @__PURE__ */ jsx("span", { className: "ut-px-3 ut-py-2 ut-text-white", children: isUploading ? /* @__PURE__ */ jsx(Spinner, {}) : `Upload ${files.length} file${files.length === 1 ? "" : "s"}` })
          }
        ) })
      ] })
    }
  );
};
export {
  UploadButton,
  UploadDropzone
};
//# sourceMappingURL=index.mjs.map