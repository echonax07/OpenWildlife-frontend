import Clustering from 'hdbscanjs';

const HIGH_ANNOT_THRESH = 100; // only run clustering on groups with > 100 annotations
let featureEnabled = false;
let clusterManagers = null;
let regionGroups = null;
let MAX_ZOOM = 12;
const MIN_LEVEL = 1;

const getCentre = (bbox) => {
  const x = (bbox.left + bbox.right) / 2;
  const y = (bbox.top + bbox.bottom) / 2;
  return [x, y];
};

const setHidden = (region, hidden) => {
    if (region && region.hidden !== hidden) {
      region.toggleHidden();
    }
}

const getTreeDepth = (node) => {
  if (!node) {
    return 0;
  }
  if (!node.left && !node.right) {
    return 1;
  }

  let maxDepth = Math.max(getTreeDepth(node.left), getTreeDepth(node.right));

  return maxDepth + 1;
}

const getClusters = (root, level) => {
  if (!root) {
    return [];
  }
  
  let exploreNodes = [[root, 1]];
  let clusters = [];
  while (exploreNodes.length != 0) {
    let node = exploreNodes.pop();
    let depth = node[1];

    if (depth == level || node[0].isLeaf) {
      clusters.push(node[0].opt);
    } else if (depth < level) {
      if (node[0].left) {
        exploreNodes.push([node[0].left, depth + 1]);
      }
      if (node[0].right) {
        exploreNodes.push([node[0].right, depth + 1]);
      }
    }
  }

  return clusters;
}

const getIndexOfMeanPoint = (points) => {
  // Find the mean of the x and y coordinates
  const meanX = points.reduce((acc, point) => acc + point.x, 0) / points.length;
  const meanY = points.reduce((acc, point) => acc + point.y, 0) / points.length;
  
  // Find the point closest to the mean
  let minDist = Infinity;
  let index = 0;
  for (let i = 0; i < points.length; i++) {
    const dist = Math.pow(points[i].x - meanX, 2) + Math.pow(points[i].y - meanY, 2);
    if (dist < minDist) {
      minDist = dist;
      index = i;
    }
  }

  return index;
}

const initClusterManagers = (regions) => {
  // console.log("Starting HDBSCAN clustering");
  const startTime = new Date();

  if (!featureEnabled) {
    clusterManagers = null;
    regionGroups = null;
    return;
  }

  regionGroups = {};
  for (let region of regions) {
    const labelName = region.labelName;
    if (!regionGroups[labelName]) {
      regionGroups[labelName] = [];
    }
    regionGroups[labelName].push(region);
  }

  clusterManagers = {};
  for (let group in regionGroups) {
    if (!(regionGroups[group].length > HIGH_ANNOT_THRESH)) {
      continue;
    }

    let distFunc = Clustering.distFunc.euclidean;
    let dataset = regionGroups[group].map(region => {
      return {
        data: getCentre(region.bboxCoords),
        opt: region
      };
    });
    let clusterer = new Clustering(dataset, distFunc);
    let treeRoot = clusterer.getTree();
    let depth = getTreeDepth(treeRoot);
    // console.log("TREE DEPTH IS " + depth);
    // console.log(treeRoot);
    clusterManagers[group] = {tree: treeRoot, depth: depth};
  }

  hideHighAnnots(regions);

  // console.log("HDBSCAN clustering complete: " + (new Date() - startTime) + " ms");

}

const setHighAnnotClusteringEnabled = (regions, enabled) => {
  if (enabled == featureEnabled) {
    return;
  }

  if (enabled) {
    featureEnabled = true;
    if (regionGroups == null && clusterManagers == null) {
      initClusterManagers(regions);
    }
    hideHighAnnots(regions);
  } else {
    featureEnabled = false;
    for (let region of regions) {
      setHidden(region, false);
      region.setCount(-1);
    }

    clusterManagers = null;
    regionGroups = null;  
  }
}

const hideHighAnnots = (regions, zoomPos=[0, 0, 100, 100], zoomLevel=1) => {
  // console.log("RUNNING HIGH ANNOT HIDER");
  let totalTime = new Date();
  
  // Ensure clusterManagers and region groups have been initialized
  if (!featureEnabled || !clusterManagers || !regionGroups) {
    return;
  }

  let setupTime = new Date();
  for (let region of regions) {
    if (region.count > 0) {
      region.setCount(-1);
    }
  }
  setupTime = new Date() - setupTime;

  let clusterTime = 0;
  let hidingTime = 0;
  for (let group in regionGroups) {
    const clusterManager = clusterManagers[group];
    if (!clusterManager) {
      continue;
    }

    const startTime = new Date();
    // let level = Math.min(Math.floor(Math.log(zoomLevel) / Math.log(MAX_ZOOM) * (clusterManager.depth-MIN_LEVEL) + MIN_LEVEL), clusterManager.depth);
    // console.log("LOGLEVEL IS " + loglevel);
    let level = Math.min(Math.floor(zoomLevel / MAX_ZOOM * (clusterManager.depth-MIN_LEVEL) + MIN_LEVEL), clusterManager.depth);
    // console.log("LEVEL IS " + level);
    let clusters = getClusters(clusterManager.tree, level);
    clusterTime += new Date() - startTime;

    const startTime2 = new Date();

    const MAX_CLUSTER_SIZE = 750;
    for (let cluster of clusters) {
      if (cluster.length > MAX_CLUSTER_SIZE) {
        let sorted = cluster.sort((a, b) => a.x - b.x);
        let splits = Math.ceil(cluster.length / MAX_CLUSTER_SIZE);
        for (let i = 0; i < splits; i++) {
          let start = i * MAX_CLUSTER_SIZE;
          let end = Math.min((i+1) * MAX_CLUSTER_SIZE, cluster.length);
          for (let j = start; j < end; j++) {
            setHidden(sorted[j], true);
          }
          let mPoint = getIndexOfMeanPoint(sorted.slice(start, end));
          sorted[start + mPoint].setCount(end - start);
          setHidden(sorted[start + mPoint], false);
        }
        // console.log(sorted);
      } else if (cluster.length > 10) {
        for (let point of cluster) {
          setHidden(point, true);
        }

        let mPoint = getIndexOfMeanPoint(cluster);
        cluster[mPoint].setCount(cluster.length);
        setHidden(cluster[mPoint], false);
      } else {
        for (let point of cluster) {
          setHidden(point, false);
        }
      }
    }

    hidingTime += new Date() - startTime2;
  }

  totalTime = new Date() - totalTime;
  /*
  console.log("HIDE HIGH ANNOT COMPLETE.");
  console.log("Total time: " + totalTime + " ms");
  console.log("Setup time %: " + (setupTime / totalTime) * 100);
  console.log("Cluster time %: " + (clusterTime / totalTime) * 100);
  console.log("Hiding time %: " + (hidingTime / totalTime) * 100);
  */
}

const setMaxZoom = (maxZoom) => {
  MAX_ZOOM = maxZoom;
}

export { hideHighAnnots, initClusterManagers, setHighAnnotClusteringEnabled, setMaxZoom };
