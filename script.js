const revealItems = document.querySelectorAll(".panel, .info-card, .section-heading");

revealItems.forEach((item) => {
  item.setAttribute("data-reveal", "");
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.18,
  }
);

revealItems.forEach((item) => observer.observe(item));

const networkRoot = document.querySelector(".edge-network");
const networkSvg = document.querySelector(".edge-network-lines");
const networkNodesRoot = document.querySelector(".edge-network-nodes");

if (networkRoot && networkSvg && networkNodesRoot) {
  const edgePadding = 110;
  const pullRadius = 180;
  const nodeCount = 22;
  const cursor = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    active: false,
  };

  const nodes = Array.from({ length: nodeCount }, (_, index) => {
    const node = document.createElement("span");
    node.className = `edge-network-node${index % 6 === 0 ? " is-alert" : ""}`;
    networkNodesRoot.append(node);

    const side = index % 4;
    const progress = (index + 1) / (nodeCount + 1);
    let baseX = 0;
    let baseY = 0;

    if (side === 0) {
      baseX = edgePadding;
      baseY = progress * window.innerHeight;
    } else if (side === 1) {
      baseX = window.innerWidth - edgePadding;
      baseY = progress * window.innerHeight;
    } else if (side === 2) {
      baseX = progress * window.innerWidth;
      baseY = edgePadding;
    } else {
      baseX = progress * window.innerWidth;
      baseY = window.innerHeight - edgePadding;
    }

    return {
      node,
      baseX,
      baseY,
      x: baseX,
      y: baseY,
      offsetX: 0,
      offsetY: 0,
      side,
    };
  });

  const linePairs = [];

  nodes.forEach((_, index) => {
    const nextIndex = (index + 1) % nodes.length;
    linePairs.push([index, nextIndex]);

    if (index + 2 < nodes.length) {
      linePairs.push([index, index + 2]);
    }
  });

  linePairs.forEach((pair, index) => {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

    if (index % 5 === 0) {
      line.classList.add("alert-line");
    }

    networkSvg.append(line);
    pair.push(line);
  });

  const setBases = () => {
    nodes.forEach((nodeData, index) => {
      const progress = (index + 1) / (nodeCount + 1);

      if (nodeData.side === 0) {
        nodeData.baseX = edgePadding;
        nodeData.baseY = progress * window.innerHeight;
      } else if (nodeData.side === 1) {
        nodeData.baseX = window.innerWidth - edgePadding;
        nodeData.baseY = progress * window.innerHeight;
      } else if (nodeData.side === 2) {
        nodeData.baseX = progress * window.innerWidth;
        nodeData.baseY = edgePadding;
      } else {
        nodeData.baseX = progress * window.innerWidth;
        nodeData.baseY = window.innerHeight - edgePadding;
      }
    });
  };

  const updateNetwork = () => {
    nodes.forEach((nodeData) => {
      const dx = cursor.x - nodeData.baseX;
      const dy = cursor.y - nodeData.baseY;
      const distance = Math.hypot(dx, dy);
      const withinEdgeZone =
        cursor.x < edgePadding * 1.7 ||
        cursor.x > window.innerWidth - edgePadding * 1.7 ||
        cursor.y < edgePadding * 1.7 ||
        cursor.y > window.innerHeight - edgePadding * 1.7;

      let targetOffsetX = 0;
      let targetOffsetY = 0;

      if (cursor.active && withinEdgeZone && distance < pullRadius) {
        const force = (1 - distance / pullRadius) * 28;
        targetOffsetX = dx * 0.12 * force / 10;
        targetOffsetY = dy * 0.12 * force / 10;
      }

      nodeData.offsetX += (targetOffsetX - nodeData.offsetX) * 0.12;
      nodeData.offsetY += (targetOffsetY - nodeData.offsetY) * 0.12;
      nodeData.x = nodeData.baseX + nodeData.offsetX;
      nodeData.y = nodeData.baseY + nodeData.offsetY;
      nodeData.node.style.transform = `translate(${nodeData.x}px, ${nodeData.y}px)`;
    });

    linePairs.forEach(([fromIndex, toIndex, line]) => {
      const fromNode = nodes[fromIndex];
      const toNode = nodes[toIndex];
      line.setAttribute("x1", `${(fromNode.x / window.innerWidth) * 100}`);
      line.setAttribute("y1", `${(fromNode.y / window.innerHeight) * 100}`);
      line.setAttribute("x2", `${(toNode.x / window.innerWidth) * 100}`);
      line.setAttribute("y2", `${(toNode.y / window.innerHeight) * 100}`);
    });

    window.requestAnimationFrame(updateNetwork);
  };

  window.addEventListener("pointermove", (event) => {
    cursor.x = event.clientX;
    cursor.y = event.clientY;
    cursor.active = true;
  });

  window.addEventListener("pointerleave", () => {
    cursor.active = false;
  });

  window.addEventListener("resize", () => {
    setBases();
  });

  setBases();
  updateNetwork();
}
