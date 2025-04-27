
const svg = d3.select('svg')
  .attr("width", window.innerWidth)
  .attr("height", window.innerHeight)
  .attr("viewBox", [0, 0, window.innerWidth, window.innerHeight])
  .attr("preserveAspectRatio", "xMidYMid meet");

const padding = { t: 40, r: 40, b: 40, l: 40 };


const gContainer = svg.append("g")
  .attr("transform", `translate(${padding.l},${padding.t})`);

svg.call(d3.zoom()
  .scaleExtent([0.5, 5])
  .on("zoom", (event) => {
    gContainer.attr("transform", event.transform);
  })
);


const card = document.getElementById('info-card');
card.style.position = 'absolute';
card.style.display = 'none';
card.style.background = '#333';
card.style.padding = '10px';
card.style.borderRadius = '8px';
card.style.color = 'white';
card.style.fontSize = '14px';
card.style.width = '250px';
card.style.boxShadow = '0 2px 10px rgba(0,0,0,0.5)';


async function getImageDetails(lineage_id) {
  try {
    const query = `
      SELECT 
        ld.lineage_id,
        ld.first_instance_commit_date,
        ld.last_instance_commit_date,
        ld.tags AS lineage_tags,
        id.image_id,
        id.tag_list AS image_tags,
        id.base_tag AS image_base_tag,
        id.committed_date AS image_commit_date
      FROM 
        lineage_details ld
      JOIN 
        lineage_id_to_image_id ili ON ld.lineage_id = ili.lineage_id
      JOIN 
        image_details id ON ili.image_id = id.image_id
      WHERE 
        ld.lineage_id = '${lineage_id}'
    `;

    const response = await fetch('https://database.vulineage.com', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ "query": query })
    });

    const data = await response.json();
    return data || []; // RETURN ARRAY
  } catch (error) {
    console.error('Error fetching image details:', error);
    return [];
  }
}


async function fetchData() {
  const nodeMap = new Map(), linkMap = new Map();
  const stack = [{ id: "7038950296606474977", parent: "-1", parent_level: -1 }];

  while (stack.length !== 0) {
    const { id: curr, parent, parent_level } = stack.pop();

    const response = await fetch("https://database.vulineage.com", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "query": `SELECT ld.lineage_id, ld.childs, ld.parents FROM lineage_details ld WHERE ld.lineage_id = ${curr}`
      })
    });
    const data = await response.json();
    const childs = JSON.parse(data[0].childs.replace(/'/g, '"'));

    if (parent !== "-1" && (nodeMap.get(curr) === undefined || nodeMap.get(curr) <= parent_level + 1)) {
      linkMap.set(curr, parent);
    } else if (nodeMap.get(curr) !== undefined && nodeMap.get(curr) > parent_level + 1) {
      continue;
    }

    nodeMap.set(curr, parent_level + 1);

    for (const child of childs) {
      stack.push({ id: child, parent: curr, parent_level: parent_level + 1 });
    }
  }

  const nodes = new Map();
  for (const [id] of nodeMap) {
    nodes.set(id, { id: id, name: id, children: [] });
  }
  for (const [childId, parentId] of linkMap) {
    if (nodes.has(parentId)) {
      nodes.get(parentId).children.push(nodes.get(childId));
    }
  }

  const rootNode = nodes.get("7038950296606474977");
  CreateTree(rootNode);
}


function CreateTree(rootData) {
  const root = d3.hierarchy(rootData);
  const treeLayout = d3.tree().nodeSize([100, 200]);
  treeLayout(root);

  const gLink = gContainer.append("g")
    .attr("fill", "none")
    .attr("stroke", "#FFF")
    .attr("stroke-opacity", 0.4)
    .attr("stroke-width", 2);

  const gNode = gContainer.append("g")
    .attr("cursor", "pointer")
    .attr("pointer-events", "all");

  const diagonal = d3.linkVertical()
    .x(d => d.x)
    .y(d => d.y);

  root.x0 = 0;
  root.y0 = 0;
  root.descendants().forEach((d, i) => {
    d.id = i;
    d._children = d.children;
    d.children = null;
  });

  update(root);

  function update(source) {
    treeLayout(root);

    const nodes = root.descendants();
    const links = root.links();

    const link = gLink.selectAll("path")
      .data(links, d => d.target.id);

    const linkEnter = link.enter().append("path")
      .attr("d", d => {
        const o = { x: source.x0, y: source.y0 };
        return diagonal({ source: o, target: o });
      });

    link.merge(linkEnter)
      .transition().duration(300)
      .attr("d", diagonal);

    link.exit().transition().duration(300)
      .attr("d", d => {
        const o = { x: source.x, y: source.y };
        return diagonal({ source: o, target: o });
      })
      .remove();

    const node = gNode.selectAll("g")
      .data(nodes, d => d.id);

    const nodeEnter = node.enter().append("g")
      .attr("transform", d => `translate(${source.x0},${source.y0})`)
      .on("click", async (event, d) => {
        d.children = d.children ? null : d._children;
        update(d);
    
        const lineageId = d.data.id || d.data.name;
        const images = await getImageDetails(lineageId);
    
        const card = document.getElementById('info-card');
    
        if (images && images.length > 0) {
            // Sort by latest commit date
            images.sort((a, b) => (a.image_commit_date || 0) - (b.image_commit_date || 0));
            const latest = images[images.length-1];
    
            // Format tags nicely
            const imageTags = latest.image_tags ? latest.image_tags.replace(/[\[\]']+/g, '') : "N/A";
            const lineageTags = latest.lineage_tags ? latest.lineage_tags.replace(/[\[\]']+/g, '') : "N/A";
    
            card.innerHTML = `
                <div class="card-body">
                    <h5 class="card-title">Image ID</h5>
                    <p class="card-text text-break">${latest.image_id || "Unknown"}</p>
                    <hr>
                    <p><strong>Image Tags:</strong> ${imageTags}</p>
                    <p><strong>Base Tag:</strong> ${latest.image_base_tag || "Unknown"}</p>
                    <p><strong>Image Commit Date:</strong> ${new Date(latest.image_commit_date * 1000).toLocaleString() || "Unknown"}</p>
                    <hr>
                    <p><strong>Lineage Tags:</strong> ${lineageTags}</p>
                    <p><strong>First Commit:</strong> ${new Date(latest.first_instance_commit_date * 1000).toLocaleString() || "Unknown"}</p>
                    <p><strong>Last Commit:</strong> ${new Date(latest.last_instance_commit_date * 1000).toLocaleString() || "Unknown"}</p>
                </div>
            `;
        } else {
            card.innerHTML = `<div class="card-body"><strong>No Image Details found.</strong></div>`;
        }
    
        const [x, y] = [d.x + padding.l, d.y + padding.t];
        card.style.left = `${x + 50}px`;
        card.style.top = `${y}px`;
        card.style.display = 'block';
    });

    nodeEnter.append("circle")
      .attr("r", 6)
      .attr("fill", "#69b3a2")
      .attr("stroke", "white")
      .attr("stroke-width", 1.5);

    nodeEnter.append("text")
      .attr("dy", "0.31em")
      .attr("x", d => d.children ? -10 : 10)
      .attr("text-anchor", d => d.children ? "end" : "start")
      .text(d => d.data.name.length > 8 ? d.data.name.slice(0, 8) + "..." : d.data.name)
      .clone(true).lower()
      .attr("stroke", "white");

    nodeEnter.append("title")
      .text(d => d.data.name);

    node.merge(nodeEnter)
      .transition().duration(300)
      .attr("transform", d => `translate(${d.x},${d.y})`);

    node.exit().transition().duration(300)
      .attr("transform", d => `translate(${source.x},${source.y})`)
      .remove();

    root.eachBefore(d => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  }
}


fetchData();
