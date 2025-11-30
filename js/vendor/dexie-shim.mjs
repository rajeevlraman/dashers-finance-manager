// re-export the global Dexie (loaded by dexie.min.js) as an ES module default
export default self.Dexie || window.Dexie;
