// src/upload-builder.ts
function createBuilder(initDef = {}) {
  const _def = {
    fileTypes: ["image"],
    maxSize: "1MB",
    // @ts-expect-error - huh?
    middleware: () => ({}),
    ...initDef
  };
  return {
    fileTypes(types) {
      return createBuilder({
        ..._def,
        fileTypes: types
      });
    },
    maxSize(size) {
      return createBuilder({
        ..._def,
        maxSize: size
      });
    },
    middleware(resolver) {
      return createBuilder({
        ..._def,
        middleware: resolver
      });
    },
    onUploadComplete(resolver) {
      return {
        _def,
        resolver
      };
    }
  };
}

// src/types.ts
var unsetMarker = "unsetMarker";

// server.ts
var createUploadStuff = () => createBuilder();
export {
  createUploadStuff,
  unsetMarker
};
//# sourceMappingURL=server.mjs.map