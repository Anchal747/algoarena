/* ==========================================
   ALGORITHM ARENA - VISUALIZER MECHANICS
   ========================================== */

/**
 * Reusable Graph Visualizer using SVG lines and overlay HTML divs.
 */
class GraphVisualizer {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = Object.assign({
      isInteractive: false,
      onNodeClick: null
    }, options);
    
    this.nodes = [];
    this.edges = [];
    this.svg = null;
    this.nodesLayer = null;
    
    this.initWorkspace();
  }

  initWorkspace() {
    this.container.innerHTML = '';
    
    // Create SVG element for edges
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.style.position = 'absolute';
    this.svg.style.top = '0';
    this.svg.style.left = '0';
    this.svg.style.zIndex = '1';
    this.container.appendChild(this.svg);
    
    // Create HTML layer for nodes
    this.nodesLayer = document.createElement('div');
    this.nodesLayer.style.position = 'absolute';
    this.nodesLayer.style.top = '0';
    this.nodesLayer.style.left = '0';
    this.nodesLayer.style.width = '100%';
    this.nodesLayer.style.height = '100%';
    this.nodesLayer.style.zIndex = '2';
    this.container.appendChild(this.nodesLayer);
  }

  setData(nodes, edges) {
    this.nodes = JSON.parse(JSON.stringify(nodes)); // deep copy
    this.edges = JSON.parse(JSON.stringify(edges));
    this.render();
  }

  render() {
    // Clear old drawings
    this.svg.innerHTML = '';
    this.nodesLayer.innerHTML = '';
    
    const width = this.container.clientWidth || 600;
    const height = this.container.clientHeight || 380;
    
    // 1. Draw Edges
    this.edges.forEach(edge => {
      const sourceNode = this.nodes.find(n => n.id === edge.source);
      const targetNode = this.nodes.find(n => n.id === edge.target);
      
      if (!sourceNode || !targetNode) return;
      
      const x1 = sourceNode.x * width;
      const y1 = sourceNode.y * height;
      const x2 = targetNode.x * width;
      const y2 = targetNode.y * height;
      
      // Draw edge line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      line.setAttribute('class', `edge-elem ${edge.state || ''}`);
      this.svg.appendChild(line);
      
      // Draw weight labels if applicable
      if (edge.weight !== undefined) {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2 - 6;
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', mx);
        text.setAttribute('y', my);
        text.setAttribute('class', 'edge-weight-label');
        text.setAttribute('text-anchor', 'middle');
        text.textContent = edge.weight;
        this.svg.appendChild(text);
      }
    });

    // 2. Draw Nodes
    this.nodes.forEach(node => {
      const x = node.x * width;
      const y = node.y * height;
      
      const div = document.createElement('div');
      div.className = `node-elem ${node.state || 'unvisited'}`;
      div.style.left = `${x}px`;
      div.style.top = `${y}px`;
      div.textContent = node.label || node.id;
      div.id = `node-${node.id}`;
      
      // Distance badges for Dijkstra
      if (node.dist !== undefined) {
        const distBadge = document.createElement('span');
        distBadge.className = 'node-dist-badge';
        distBadge.textContent = node.dist === Infinity ? '∞' : `${node.dist} min`;
        div.appendChild(distBadge);
      }
      
      if (this.options.isInteractive && node.state !== 'visited') {
        div.style.cursor = 'pointer';
        div.onclick = () => {
          if (this.options.onNodeClick) {
            this.options.onNodeClick(node.id);
          }
        };
      }
      
      this.nodesLayer.appendChild(div);
    });
  }

  updateNodeState(nodeId, state, dist = undefined) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      node.state = state;
      if (dist !== undefined) node.dist = dist;
      const el = document.getElementById(`node-${nodeId}`);
      if (el) {
        el.className = `node-elem ${state}`;
        if (dist !== undefined) {
          let badge = el.querySelector('.node-dist-badge');
          if (!badge) {
            badge = document.createElement('span');
            badge.className = 'node-dist-badge';
            el.appendChild(badge);
          }
          badge.textContent = dist === Infinity ? '∞' : `${dist} min`;
        }
      }
    }
  }

  updateEdgeState(sourceId, targetId, state) {
    const edge = this.edges.find(e => 
      (e.source === sourceId && e.target === targetId) ||
      (e.source === targetId && e.target === sourceId)
    );
    if (edge) {
      edge.state = state;
      this.render(); // Re-render to update line styles
    }
  }
}

/**
 * Reusable Maze/Grid visualizer for Depth-First Search
 */
class MazeVisualizer {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = Object.assign({
      rows: 6,
      cols: 6,
      onCellClick: null,
      isInteractive: false
    }, options);
    
    this.grid = [];
    this.startCell = { r: 0, c: 0 };
    this.exitCell = { r: 5, c: 5 };
    this.currentPath = [];
    this.visited = new Set();
    
    this.initMaze();
  }

  initMaze() {
    this.container.innerHTML = '';
    
    const size = Math.min(this.container.clientWidth, this.container.clientHeight) || 350;
    
    const gridDiv = document.createElement('div');
    gridDiv.className = 'maze-grid';
    gridDiv.style.gridTemplateRows = `repeat(${this.options.rows}, 1fr)`;
    gridDiv.style.gridTemplateColumns = `repeat(${this.options.cols}, 1fr)`;
    gridDiv.style.width = `${size}px`;
    gridDiv.style.height = `${size}px`;
    
    this.container.appendChild(gridDiv);
    
    // Set up standard maze representation (0=empty, 1=wall)
    this.grid = [
      [0, 0, 0, 0, 0, 0],
      [1, 1, 0, 1, 1, 0],
      [0, 0, 0, 0, 1, 0],
      [0, 1, 1, 0, 0, 0],
      [0, 1, 0, 1, 1, 0],
      [0, 0, 0, 0, 0, 0]
    ];
    
    for (let r = 0; r < this.options.rows; r++) {
      for (let c = 0; c < this.options.cols; c++) {
        const cell = document.createElement('div');
        cell.id = `cell-${r}-${c}`;
        cell.className = 'maze-cell';
        
        if (this.grid[r][c] === 1) {
          cell.classList.add('wall');
        } else if (r === this.startCell.r && c === this.startCell.c) {
          cell.classList.add('start');
          cell.textContent = '🚀';
        } else if (r === this.exitCell.r && c === this.exitCell.c) {
          cell.classList.add('exit');
          cell.textContent = '🚪';
        }
        
        if (this.options.isInteractive && this.grid[r][c] === 0) {
          cell.onclick = () => {
            if (this.options.onCellClick) {
              this.options.onCellClick(r, c);
            }
          };
        }
        
        gridDiv.appendChild(cell);
      }
    }
  }

  updateCellState(r, c, state, emoji = '') {
    const cell = document.getElementById(`cell-${r}-${c}`);
    if (cell) {
      cell.classList.remove('visited', 'current');
      if (state) cell.classList.add(state);
      if (emoji) cell.textContent = emoji;
      else if (r === this.startCell.r && c === this.startCell.c) cell.textContent = '🚀';
      else if (r === this.exitCell.r && c === this.exitCell.c) cell.textContent = '🚪';
      else cell.textContent = '';
    }
  }
}

/**
 * Reusable Sorting Visualizer
 */
class SortingVisualizer {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = Object.assign({
      onCompare: null,
      onSwap: null
    }, options);
    
    this.array = [];
    this.blocks = [];
    this.initLayout();
  }

  initLayout() {
    this.container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'sorting-container';
    this.container.appendChild(wrapper);
    this.wrapper = wrapper;
  }

  setArray(arr) {
    this.array = [...arr];
    this.render();
  }

  render() {
    this.wrapper.innerHTML = '';
    this.blocks = [];
    
    const maxVal = Math.max(...this.array, 1);
    
    this.array.forEach((val, index) => {
      const block = document.createElement('div');
      block.className = 'sort-block';
      block.id = `sort-block-${index}`;
      
      // Set height based on percentage of max value
      const heightPercent = (val / maxVal) * 85; // cap at 85% for spacing
      block.style.height = `${heightPercent}%`;
      block.textContent = val;
      
      this.wrapper.appendChild(block);
      this.blocks.push(block);
    });
  }

  highlightComparing(indices, isComparing = true) {
    indices.forEach(idx => {
      const block = document.getElementById(`sort-block-${idx}`);
      if (block) {
        if (isComparing) block.classList.add('comparing');
        else block.classList.remove('comparing');
      }
    });
  }

  highlightPivot(index, isPivot = true) {
    const block = document.getElementById(`sort-block-${index}`);
    if (block) {
      if (isPivot) block.classList.add('pivot');
      else block.classList.remove('pivot');
    }
  }

  highlightSwapped(indices, isSwapped = true) {
    indices.forEach(idx => {
      const block = document.getElementById(`sort-block-${idx}`);
      if (block) {
        if (isSwapped) block.classList.add('swapped');
        else block.classList.remove('swapped');
      }
    });
  }

  swapBlocks(i, j) {
    // Perform value swap in internal state
    const temp = this.array[i];
    this.array[i] = this.array[j];
    this.array[j] = temp;
    
    // Quick swap elements in the DOM directly for fluid visual transitions
    const el1 = this.blocks[i];
    const el2 = this.blocks[j];
    
    if (el1 && el2) {
      const height1 = el1.style.height;
      const text1 = el1.textContent;
      
      el1.style.height = el2.style.height;
      el1.textContent = el2.textContent;
      
      el2.style.height = height1;
      el2.textContent = text1;
    }
  }

  updateValue(idx, val) {
    this.array[idx] = val;
    const block = document.getElementById(`sort-block-${idx}`);
    if (block) {
      const maxVal = Math.max(...this.array, 1);
      block.style.height = `${(val / maxVal) * 85}%`;
      block.textContent = val;
    }
  }
}
