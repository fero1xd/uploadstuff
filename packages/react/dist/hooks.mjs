"use client";

// src/useUploadStuff.ts
import { useState } from "react";

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
var generateReactHelpers = () => {
  return {
    useUploadStuff,
    uploadFiles: DANGEROUS__uploadFiles
  };
};
export {
  generateReactHelpers
};
//# sourceMappingURL=hooks.mjs.map