import { OBJLoader } from "./obj-loader.js";

export const ModelLoaderOBJ = (url) => {
  return new Promise((resolve, reject) => {
    // instantiate a loader
    const loader = new OBJLoader();
    // load a resource
    loader.load(
      // resource URL
      url,
      // called when resource is loaded, assumes we get a group back, this might be bad
      function ({ children }) {
        if (!children[0]) return;

        const child = children[0];
        resolve(child);
      },
      // called when loading is in progresses
      function (xhr) {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
      },
      // called when loading has errors
      function (error) {
        console.log("An error happened");
        reject(error);
      }
    );
  });
};
