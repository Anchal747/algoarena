/* ==========================================
   ALGORITHM ARENA - CORE LOGIC & CONTROLLER
   ========================================== */

// Global Application State
const state = {
  xp: 0,
  navXp: 0, // Animated XP value
  unlockedMissions: ['bfs'],
  badges: new Set(),
  activeTab: 'home',

  // Mission progression
  activeMission: null,
  activeStepIndex: 0,
  hintUsedInMission: false,
  perfectMission: true,

  // Lab visualizer elements
  labAlgo: 'bfs',
  labInterval: null,
  labRunning: false,
  labData: null,

  // Quiz states
  quizIndex: 0,
  quizScore: 0,

  // Final Arena states
  arenaIndex: 0,
  arenaScore: 0,
  arenaIncorrectCount: 0,
  arenaHintsCount: 0
};

// Initial document load setup
document.addEventListener('DOMContentLoaded', () => {
  initHeroAnimation();
  updateXPNav();
  loadLearnDoc('bfs');
  onLabAlgoChange();
  renderComplexityChart(50);
  initDuoRoadProgress();
});

/* ==========================================
   1. APP NAVIGATION & ROUTING
   ========================================== */
function switchTab(tabId) {
  // Clear any running lab simulator
  resetLabSimulator();

  // Hide all sections, display target
  document.querySelectorAll('.tab-section').forEach(section => {
    section.classList.remove('active');
  });

  const targetSection = document.getElementById(`tab-${tabId}`);
  if (targetSection) {
    targetSection.classList.add('active');
  }

  // Update navigation link highlighting
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-tab') === tabId) {
      item.classList.add('active');
    }
  });

  state.activeTab = tabId;

  // Handle tab-specific initializations
  if (tabId === 'missions') {
    initDuoRoadProgress();
  } else if (tabId === 'lab') {
    generateLabInput();
  } else if (tabId === 'complexity') {
    updateComplexitySlider(document.getElementById('complexity-n-slider').value);
  } else if (tabId === 'quiz') {
    resetQuiz();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ==========================================
   2. GAMIFICATION SYSTEM & BADGES
   ========================================== */
function addXP(amount) {
  state.xp += amount;
  animateXPCount();

  // Visual floating indicator
  const navXpEl = document.getElementById('nav-xp');
  if (navXpEl) {
    const floatText = document.createElement('span');
    floatText.textContent = `+${amount} XP`;
    floatText.style.position = 'absolute';
    floatText.style.color = 'var(--accent-emerald)';
    floatText.style.fontWeight = '800';
    floatText.style.fontSize = '12px';
    floatText.style.left = '40px';
    floatText.style.top = '-10px';
    floatText.style.animation = 'xp-rise 1s ease-out forwards';
    navXpEl.parentElement.appendChild(floatText);
    setTimeout(() => floatText.remove(), 1000);
  }
}

function animateXPCount() {
  const xpEl = document.getElementById('nav-xp');
  if (!xpEl) return;

  const diff = state.xp - state.navXp;
  if (diff <= 0) return;

  const step = Math.ceil(diff / 10);
  state.navXp += step;
  xpEl.textContent = state.navXp;

  if (state.navXp < state.xp) {
    requestAnimationFrame(animateXPCount);
  }
}

function unlockBadge(badgeId, title, desc) {
  if (state.badges.has(badgeId)) return;

  state.badges.add(badgeId);

  // Update navbar dot
  document.getElementById('nav-badge-count').textContent = state.badges.size;

  // Show toast notification
  const toast = document.getElementById('toast-notification');
  document.getElementById('toast-title').textContent = `🏆 Badge Unlocked: ${title}`;
  document.getElementById('toast-desc').textContent = desc;

  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);

  // Mark unlocked in modal grid
  const badgeCard = document.querySelector(`.badge-item[data-badge="${badgeId}"]`);
  if (badgeCard) {
    badgeCard.classList.remove('locked');
    badgeCard.classList.add('unlocked');
  }
}

function openBadgesModal() {
  document.getElementById('badges-modal').classList.remove('hidden');
}

function closeBadgesModal() {
  document.getElementById('badges-modal').classList.add('hidden');
}

function updateXPNav() {
  document.getElementById('nav-xp').textContent = state.xp;
}

function initDuoRoadProgress() {
  const missions = ['bfs', 'dfs', 'dijkstra', 'bubble', 'merge', 'quick'];
  missions.forEach((m, idx) => {
    const node = document.getElementById(`node-${m}`);
    if (node) {
      if (state.unlockedMissions.includes(m)) {
        node.classList.remove('locked');
        node.classList.add('active');
        // If next is unlocked, this is completed
        const isCompleted = idx < state.unlockedMissions.length - 1;
        const fill = node.querySelector('.fill');
        if (fill) {
          fill.style.width = isCompleted ? '100%' : '0%';
        }
        if (isCompleted) {
          node.classList.add('completed');
        }
      } else {
        node.classList.add('locked');
        node.classList.remove('active', 'completed');
      }
    }
  });
}

/* ==========================================
   3. HERO LANDING ANIMATION (CANVAS NODES)
   ========================================== */
function initHeroAnimation() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = canvas.parentElement.clientWidth;
  let height = canvas.parentElement.clientHeight;
  canvas.width = width;
  canvas.height = height;

  const nodes = [
    { x: 0.15, y: 0.3, r: 16, color: '#6366f1', label: 'A', connections: [1, 2], pulse: 0 },
    { x: 0.45, y: 0.2, r: 14, color: '#38bdf8', label: 'B', connections: [3], pulse: 0 },
    { x: 0.35, y: 0.6, r: 15, color: '#f59e0b', label: 'C', connections: [3, 4], pulse: 0 },
    { x: 0.75, y: 0.3, r: 18, color: '#10b981', label: 'D', connections: [5], pulse: 0 },
    { x: 0.6, y: 0.75, r: 12, color: '#ec4899', label: 'E', connections: [5], pulse: 0 },
    { x: 0.85, y: 0.7, r: 16, color: '#8b5cf6', label: 'F', connections: [], pulse: 0 }
  ];

  let time = 0;

  function draw() {
    ctx.clearRect(0, 0, width, height);
    time += 0.02;

    // Draw Edges
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#cbd5e1';
    nodes.forEach(node => {
      node.connections.forEach(targetIdx => {
        const target = nodes[targetIdx];
        ctx.beginPath();
        ctx.moveTo(node.x * width, node.y * height);
        ctx.lineTo(target.x * width, target.y * height);
        ctx.stroke();

        // Animated data packet along path
        const dist = Math.sqrt(Math.pow((target.x - node.x) * width, 2) + Math.pow((target.y - node.y) * height, 2));
        const progress = (time * 30 % dist) / dist;
        const px = (node.x + (target.x - node.x) * progress) * width;
        const py = (node.y + (target.y - node.y) * progress) * height;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#6366f1';
        ctx.fill();
      });
    });

    // Draw Nodes
    nodes.forEach((node, idx) => {
      const nx = node.x * width;
      const ny = node.y * height;

      // Glow pulse
      node.pulse = Math.sin(time + idx) * 4;
      ctx.beginPath();
      ctx.arc(nx, ny, node.r + 4 + node.pulse, 0, Math.PI * 2);
      ctx.fillStyle = node.color + '1a';
      ctx.fill();

      // Node body
      ctx.beginPath();
      ctx.arc(nx, ny, node.r, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.strokeStyle = node.color;
      ctx.lineWidth = 3;
      ctx.fill();
      ctx.stroke();

      // Text Label
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.label, nx, ny);
    });

    requestAnimationFrame(draw);
  }

  // Handle window resizing
  window.addEventListener('resize', () => {
    if (canvas.parentElement) {
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight;
      canvas.width = width;
      canvas.height = height;
    }
  });

  draw();
}

/* ==========================================
   4. MISSIONS - DIALOGUE & STORY ENGINE
   ========================================== */
const missionStories = {
  bfs: {
    title: 'THE CONNECTION FINDER',
    companion: { name: 'Professor Algo', avatar: '👨‍🏫' },
    nodes: [
      { id: 'Maya', label: 'Maya', x: 0.15, y: 0.5, state: 'current' },
      { id: 'Alex', label: 'Alex', x: 0.45, y: 0.25, state: 'unvisited' },
      { id: 'Sam', label: 'Sam', x: 0.45, y: 0.75, state: 'unvisited' },
      { id: 'Chloe', label: 'Chloe', x: 0.7, y: 0.15, state: 'unvisited' },
      { id: 'Liam', label: 'Liam', x: 0.7, y: 0.5, state: 'unvisited' },
      { id: 'Zoe', label: 'Zoe', x: 0.7, y: 0.85, state: 'unvisited' },
      { id: 'Ryan', label: 'Ryan', x: 0.9, y: 0.5, state: 'destination' }
    ],
    edges: [
      { source: 'Maya', target: 'Alex' },
      { source: 'Maya', target: 'Sam' },
      { source: 'Alex', target: 'Chloe' },
      { source: 'Alex', target: 'Liam' },
      { source: 'Sam', target: 'Liam' },
      { source: 'Sam', target: 'Zoe' },
      { source: 'Chloe', target: 'Ryan' },
      { source: 'Liam', target: 'Ryan' },
      { source: 'Zoe', target: 'Ryan' }
    ],
    steps: [
      {
        text: 'A social network needs to find the minimum connection path between Maya and Ryan. What is the fundamental approach of Breadth-First Search (BFS)?',
        options: [
          'Pick one friend and follow their chain deep to the end first.',
          'Explore all friends 1 connection away, then 2 connections away, level by level.'
        ],
        correct: 1,
        feedback: 'Correct! BFS explores node levels sequentially, finding the shortest path in unweighted graphs.',
        errorFeedback: 'Not quite. Following one chain deep is characteristic of Depth-First Search (DFS). BFS explores level-by-level.',
        hint: 'Think about exploring neighbors in concentric rings.'
      },
      {
        text: 'Let\'s start at Maya (our level 0 source). We need a Queue to track nodes to visit. Let\'s enqueue Maya. Who are Maya\'s immediate (Level 1) neighbors?',
        options: [
          'Alex and Sam',
          'Chloe, Liam, and Zoe'
        ],
        correct: 0,
        feedback: 'Correct! Alex and Sam are direct friends of Maya.',
        errorFeedback: 'Incorrect. Chloe, Liam, and Zoe are two steps away. We must check immediately adjacent friends first.',
        hint: 'Find the nodes directly linked to Maya.',
        action: (viz) => {
          viz.updateNodeState('Alex', 'discovered');
          viz.updateNodeState('Sam', 'discovered');
          updateTraceDS('QUEUE', ['Alex', 'Sam']);
        }
      },
      {
        text: 'Now we de-queue the first element: Alex. We explore his neighbors who haven\'t been visited. Who should we add to the queue next?',
        options: [
          'Maya and Sam',
          'Chloe and Liam'
        ],
        correct: 1,
        feedback: 'Correct! Chloe and Liam are new discoveries. Sam is already in the queue, and Maya has been visited.',
        errorFeedback: 'Wait, Maya is already visited! We shouldn\'t re-add visited nodes, otherwise we\'ll get stuck in infinite loops.',
        hint: 'Avoid nodes already visited or currently in the queue.',
        action: (viz) => {
          viz.updateNodeState('Maya', 'visited');
          viz.updateNodeState('Alex', 'current');
          viz.updateNodeState('Chloe', 'discovered');
          viz.updateNodeState('Liam', 'discovered');
          viz.updateEdgeState('Maya', 'Alex', 'highlighted');
          updateTraceDS('QUEUE', ['Sam', 'Chloe', 'Liam']);
        }
      },
      {
        text: 'Next, we de-queue Sam. What are his unvisited neighbors to enqueue?',
        options: [
          'Zoe (Liam is already in the queue)',
          'Liam and Zoe'
        ],
        correct: 0,
        feedback: 'Excellent observation! Liam is already in the queue, so we only need to enqueue Zoe.',
        errorFeedback: 'Be careful! Adding Liam again would create duplicates in the queue, wasting computational steps.',
        hint: 'Check if a node is already waiting in the queue.',
        action: (viz) => {
          viz.updateNodeState('Alex', 'visited');
          viz.updateNodeState('Sam', 'current');
          viz.updateNodeState('Zoe', 'discovered');
          viz.updateEdgeState('Maya', 'Sam', 'highlighted');
          updateTraceDS('QUEUE', ['Chloe', 'Liam', 'Zoe']);
        }
      },
      {
        text: 'Now we de-queue Chloe. Chloe is directly connected to our target, Ryan! Since we reached Ryan, BFS is complete. What is the shortest path length?',
        options: [
          '4 edges',
          '3 edges'
        ],
        correct: 1,
        feedback: 'Perfect! The shortest connection path is Maya -> Alex -> Chloe -> Ryan (3 edges).',
        errorFeedback: 'Count the segments: Maya(0) -> Alex(1) -> Chloe(2) -> Ryan(3). The shortest path is 3 steps.',
        hint: 'Count the steps: Maya to Alex, Alex to Chloe, Chloe to Ryan.',
        action: (viz) => {
          viz.updateNodeState('Sam', 'visited');
          viz.updateNodeState('Chloe', 'current');
          viz.updateNodeState('Ryan', 'current');
          viz.updateEdgeState('Alex', 'Chloe', 'highlighted');
          viz.updateEdgeState('Chloe', 'Ryan', 'highlighted');
          updateTraceDS('QUEUE', ['Liam', 'Zoe']);
        }
      }
    ]
  },
  dfs: {
    title: 'ESCAPE THE MAZE',
    companion: { name: 'Adventurer Dan', avatar: '🕵️' },
    steps: [
      {
        text: 'We are stuck at the START of a dark dungeon (0,0) and need to reach the EXIT (5,5). Depth-First Search (DFS) is a backtracking algorithm. What data structure does DFS use to remember its path?',
        options: [
          'A Stack (either explicit or implicit via recursion).',
          'A Queue (FIFO structure).'
        ],
        correct: 0,
        feedback: 'Correct! DFS uses a Stack (LIFO: Last In First Out) to keep going deeper and backtrack when it hits a wall.',
        errorFeedback: 'Nope. BFS uses a Queue. DFS uses a Stack (or recursion) to go deep and return to the last decision point.',
        hint: 'Think: "Last visited node, first backtracked node".',
        action: (viz) => {
          viz.updateCellState(0, 0, 'current');
          updateTraceDS('STACK', ['(0,0)']);
        }
      },
      {
        text: 'Let\'s head down. We walk through empty spaces: (0,0) -> (0,1) -> (0,2). Here, we reach a fork. We can go down to (1,2) or right to (0,3). Let\'s try going right to (0,3). Wait, what happens at (1,3)?',
        options: [
          'It is a dead end/wall. DFS will backtrack.',
          'It is an empty corridor leading straight to exit.'
        ],
        correct: 0,
        feedback: 'Correct! There is a wall blocks away. DFS will keep going deep down that corridor, hit the wall, and then backtrack to (0,2).',
        errorFeedback: 'Incorrect. If you look at the grid, going right leads to blocked wall cells. We will have to turn back.',
        hint: 'Look at the cell walls representation.',
        action: (viz) => {
          viz.updateCellState(0, 0, 'visited');
          viz.updateCellState(0, 1, 'visited');
          viz.updateCellState(0, 2, 'visited');
          viz.updateCellState(0, 3, 'current');
          updateTraceDS('STACK', ['(0,0)', '(0,1)', '(0,2)', '(0,3)']);
        }
      },
      {
        text: 'Let\'s head down the alternative path instead: (0,2) -> (2,2) -> (2,1) -> (2,0) -> (3,0) -> (4,0) -> (5,0) -> (5,1) -> (5,2). Oh no! (5,2) is a complete dead end! What should we do?',
        options: [
          'Teleport back to the start and try completely random paths.',
          'Backtrack by popping elements off our stack until we return to the last cell with unvisited options.'
        ],
        correct: 1,
        feedback: 'Absolutely! Backtracking is the core of DFS. We pop (5,2), (5,1), (5,0), etc., off the stack until we reach (2,2) which has an unvisited path to (3,2).',
        errorFeedback: 'Incorrect. Backtracking is structural, not random. We step back link-by-link using our stack history.',
        hint: 'How do you return from a dead end in a maze?',
        action: (viz) => {
          // Highlight dead end path
          const path = [[2, 2], [2, 1], [2, 0], [3, 0], [4, 0], [5, 0], [5, 1], [5, 2]];
          path.forEach(([r, c]) => viz.updateCellState(r, c, 'visited'));
          viz.updateCellState(5, 2, 'current');
          updateTraceDS('STACK', ['(0,0)', '(0,1)', '(0,2)', '(2,2)', '...']);
        }
      },
      {
        text: 'Backtracked to (2,2)! Now we explore the unvisited branch: (2,2) -> (3,2) -> (3,3) -> (3,4) -> (4,4) -> (5,4) -> (5,5). Success! We reached the exit! What is DFS worst-case space complexity in terms of tree height $H$?',
        options: [
          'O(H) representing stack size.',
          'O(V^2) representing grid volume.'
        ],
        correct: 0,
        feedback: 'Correct! The space complexity of DFS is bounded by the maximum recursion depth, which is O(H).',
        errorFeedback: 'Incorrect. DFS memory overhead is only the active path stack, which is linear to the depth of exploration: O(H).',
        hint: 'The maximum size of the call stack matches the path height.',
        action: (viz) => {
          const escapePath = [[3, 2], [3, 3], [3, 4], [4, 4], [5, 4], [5, 5]];
          escapePath.forEach(([r, c]) => viz.updateCellState(r, c, 'current'));
          updateTraceDS('STACK', ['(0,0)', '(0,1)', '(0,2)', '(2,2)', '(3,2)', '(3,3)', '(3,4)', '(4,4)', '(5,4)', '(5,5)']);
        }
      }
    ]
  },
  dijkstra: {
    title: 'EMERGENCY ROUTE',
    companion: { name: 'Dispatcher Max', avatar: '🚑' },
    nodes: [
      { id: 'A', label: 'A', x: 0.1, y: 0.5, dist: 0, state: 'current' },
      { id: 'B', label: 'B', x: 0.35, y: 0.25, dist: Infinity, state: 'unvisited' },
      { id: 'C', label: 'C', x: 0.35, y: 0.75, dist: Infinity, state: 'unvisited' },
      { id: 'D', label: 'D', x: 0.6, y: 0.25, dist: Infinity, state: 'unvisited' },
      { id: 'E', label: 'E', x: 0.6, y: 0.75, dist: Infinity, state: 'unvisited' },
      { id: 'F', label: 'F', x: 0.8, y: 0.5, dist: Infinity, state: 'unvisited' },
      { id: 'H', label: 'H', x: 0.95, y: 0.5, dist: Infinity, state: 'destination' }
    ],
    edges: [
      { source: 'A', target: 'B', weight: 4 },
      { source: 'A', target: 'C', weight: 2 },
      { source: 'B', target: 'D', weight: 5 },
      { source: 'C', target: 'D', weight: 8 },
      { source: 'C', target: 'E', weight: 3 },
      { source: 'D', target: 'H', weight: 6 },
      { source: 'E', target: 'F', weight: 1 },
      { source: 'F', target: 'H', weight: 4 }
    ],
    steps: [
      {
        text: 'An ambulance must travel from Node A to the hospital at Node H. Roads have travel times. How does Dijkstra initialize the node distances?',
        options: [
          'Source (A) = 0, all other nodes = Infinity.',
          'All nodes = 0.'
        ],
        correct: 0,
        feedback: 'Correct! Dijkstra initializes tentative distances to Infinity because we do not know any paths yet.',
        errorFeedback: 'Incorrect. If all nodes were initialized to 0, we could not evaluate shortest distance relaxations.',
        hint: 'Initialize everything to the worst-case distance value.'
      },
      {
        text: 'We visit Node A. Its neighbors are B (weight 4) and C (weight 2). Let\'s update (relax) their distances. What are the tentative distances for B and C now?',
        options: [
          'B = 4, C = 2',
          'B = Infinity, C = Infinity'
        ],
        correct: 0,
        feedback: 'Correct! Since 0 + 4 < Infinity, and 0 + 2 < Infinity, we relax both distances.',
        errorFeedback: 'Incorrect. We relaxed their distances from Infinity to the weight values since 4 and 2 are smaller.',
        hint: 'Tentative distance = Current node distance + Edge weight.',
        action: (viz) => {
          viz.updateNodeState('A', 'visited');
          viz.updateNodeState('B', 'discovered', 4);
          viz.updateNodeState('C', 'discovered', 2);
          updateTraceDS('MIN-HEAP', ['C:2', 'B:4']);
        }
      },
      {
        text: 'Which unvisited node should Dijkstra explore next?',
        options: [
          'Node B (dist 4)',
          'Node C (dist 2) because it has the smallest tentative distance'
        ],
        correct: 1,
        feedback: 'Correct! Dijkstra is a greedy algorithm; it always chooses the unvisited node with the absolute smallest tentative distance.',
        errorFeedback: 'Incorrect. Dijkstra greedily selects the smallest distance: Node C (2) is smaller than Node B (4).',
        hint: 'Choose the smallest value in the heap.',
        action: (viz) => {
          viz.updateNodeState('C', 'current');
        }
      },
      {
        text: 'Visiting Node C (dist 2). Its neighbor E has edge weight 3. The new path length is 2 + 3 = 5. E\'s current distance is Infinity. Should we relax E to 5?',
        options: [
          'Yes, update E to 5',
          'No, keep E at Infinity'
        ],
        correct: 0,
        feedback: 'Correct! 5 is smaller than Infinity, so we relax Node E to 5.',
        errorFeedback: 'No, we must relax it! 5 is shorter than Infinity.',
        hint: 'Is 5 less than the existing distance?',
        action: (viz) => {
          viz.updateNodeState('E', 'discovered', 5);
          viz.updateNodeState('C', 'visited');
          viz.updateEdgeState('A', 'C', 'highlighted');
          viz.updateEdgeState('C', 'E', 'highlighted');
          updateTraceDS('MIN-HEAP', ['B:4', 'E:5', 'D:10']);
        }
      },
      {
        text: 'From E (dist 5), we explore E -> F (weight 1) relaxing F to 6. From F (dist 6), we explore F -> H (weight 4) relaxing Hospital H to 10. Dijkstra selects the shortest paths. What is the total route duration to Hospital H?',
        options: [
          '10 minutes',
          '12 minutes'
        ],
        correct: 0,
        feedback: 'Success! The ambulance takes path A -> C -> E -> F -> H in exactly 10 minutes total.',
        errorFeedback: 'Review the path sums: A(0) -> C(2) -> E(5) -> F(6) -> H(10). Total path cost is 10.',
        hint: 'Add the weights: 2 + 3 + 1 + 4.',
        action: (viz) => {
          viz.updateNodeState('E', 'visited');
          viz.updateNodeState('F', 'visited', 6);
          viz.updateNodeState('H', 'current', 10);
          viz.updateEdgeState('E', 'F', 'highlighted');
          viz.updateEdgeState('F', 'H', 'highlighted');
          updateTraceDS('MIN-HEAP', []);
        }
      }
    ]
  },
  bubble: {
    title: 'THE BUBBLE MACHINE',
    companion: { name: 'Warehouse Supervisor', avatar: '📦' },
    array: [42, 7, 19, 3, 12],
    steps: [
      {
        text: 'We have packages at random priorities: `[42, 7, 19, 3, 12]`. What is the core behavior of Bubble Sort?',
        options: [
          'Compare adjacent packages and swap them if they are in the wrong order.',
          'Split the entire stack in half recursively.'
        ],
        correct: 0,
        feedback: 'Correct! Bubble Sort makes multiple passes, swapping neighboring elements so larger values "bubble" to the end.',
        errorFeedback: 'Incorrect. Splitting recursively is Merge Sort. Bubble Sort focuses on adjacent comparisons.',
        hint: 'Think of elements bubbling up to their place.'
      },
      {
        text: 'Let\'s compare the first two packages: 42 and 7. Since we are sorting in ascending order, should we swap them?',
        options: [
          'Yes, because 42 is greater than 7.',
          'No, they are already sorted.'
        ],
        correct: 0,
        feedback: 'Correct! 42 > 7, so they must be swapped.',
        errorFeedback: 'Incorrect. 42 is larger than 7, so they are out of order for ascending values.',
        hint: 'Is 42 > 7?',
        action: (viz) => {
          viz.highlightComparing([0, 1]);
          setTimeout(() => {
            viz.swapBlocks(0, 1);
            viz.highlightComparing([0, 1], false);
            updateTraceDS('ARRAY', [7, 42, 19, 3, 12]);
          }, 600);
        }
      },
      {
        text: 'The array is now `[7, 42, 19, 3, 12]`. We compare the next pair: 42 and 19. Do we swap them?',
        options: [
          'Yes, because 42 > 19.',
          'No, keep them.'
        ],
        correct: 0,
        feedback: 'Correct! We swap them, bubbling 42 further right.',
        errorFeedback: 'Incorrect. 42 is larger than 19, so they must swap.',
        hint: '42 is still the largest; continue bubbling it.',
        action: (viz) => {
          viz.highlightComparing([1, 2]);
          setTimeout(() => {
            viz.swapBlocks(1, 2);
            viz.highlightComparing([1, 2], false);
            updateTraceDS('ARRAY', [7, 19, 42, 3, 12]);
          }, 600);
        }
      },
      {
        text: 'After bubbling 42 to the end of the array in the first complete pass, what is the worst-case time complexity of Bubble Sort?',
        options: [
          'O(N log N)',
          'O(N^2) due to nested loops/passes'
        ],
        correct: 1,
        feedback: 'Perfect! Because we must compare almost every element with every other element in the worst case, complexity is quadratic: O(N^2).',
        errorFeedback: 'No, Bubble Sort requires nested passes, resulting in O(N^2) complexity.',
        hint: 'Nested iterations over N elements.',
        action: (viz) => {
          // Bubble 42 to end completely for visualization
          viz.setArray([7, 19, 3, 12, 42]);
          updateTraceDS('ARRAY', [7, 19, 3, 12, 42]);
        }
      }
    ]
  },
  merge: {
    title: 'DIVIDE & CONQUER FACTORY',
    companion: { name: 'Logistics Manager', avatar: '🧩' },
    array: [42, 7, 19, 3, 12],
    steps: [
      {
        text: 'We have a large list of warehouse items. Merge Sort is a divide-and-conquer algorithm. What is its first step?',
        options: [
          'Compare the first and last elements.',
          'Divide the array in half recursively until sub-arrays have a size of 1.'
        ],
        correct: 1,
        feedback: 'Correct! Merge Sort divides the array down to single elements which are trivially sorted by definition.',
        errorFeedback: 'Incorrect. Merge Sort first splits the unsorted data array recursively.',
        hint: 'Think "Divide" in divide and conquer.',
        action: (viz) => {
          // Show dividing arrays visually
          updateTraceDS('SUB-PROBLEMS', ['[42, 7, 19]', '[3, 12]']);
        }
      },
      {
        text: 'Once divided into singletons, how does Merge Sort combine them?',
        options: [
          'Merge sorted sub-arrays back together by comparing their front elements.',
          'Place all elements back randomly and run Bubble Sort.'
        ],
        correct: 0,
        feedback: 'Excellent! We merge sorted sub-arrays, taking the smallest front element each time, preserving sorting order.',
        errorFeedback: 'No, that would destroy efficiency. We merge them in a sorted manner.',
        hint: 'Compare the heads of the two sorted list parts.',
        action: (viz) => {
          viz.setArray([7, 42, 19, 3, 12]);
          updateTraceDS('MERGING', ['[7, 42]', '[19]', '[3, 12]']);
        }
      },
      {
        text: 'What auxiliary space complexity does standard Merge Sort require for its temporary merging buffers?',
        options: [
          'O(1) - it is completely in-place.',
          'O(N) - it requires auxiliary memory arrays proportional to input size.'
        ],
        correct: 1,
        feedback: 'Correct! Standard Merge Sort requires O(N) auxiliary space to hold elements during merging.',
        errorFeedback: 'No. Merge Sort is not in-place; it requires auxiliary workspace O(N) to merge arrays.',
        hint: 'Think of the separate arrays created when merging.',
        action: (viz) => {
          viz.setArray([3, 7, 12, 19, 42]);
          updateTraceDS('ARRAY', [3, 7, 12, 19, 42]);
        }
      }
    ]
  },
  quick: {
    title: 'THE PIVOT MASTER',
    companion: { name: 'Priority Chief', avatar: '⚡' },
    array: [19, 7, 42, 3, 12],
    steps: [
      {
        text: 'We want to sort `[19, 7, 42, 3, 12]` with Quick Sort. What is the "pivot"?',
        options: [
          'An element selected to partition the array around.',
          'The average value of the array.'
        ],
        correct: 0,
        feedback: 'Correct! The pivot is the element we partition around, moving smaller items left, and larger items right.',
        errorFeedback: 'Incorrect. The pivot is a chosen element index, not the calculated average value.',
        hint: 'The central element in partitioning.'
      },
      {
        text: 'If we choose the last element, 12, as our pivot, what will the partitioned structure look like?',
        options: [
          'Elements smaller than 12 on the left: `[7, 3]`, pivot `12` in middle, larger on right: `[19, 42]`.',
          'Everything sorted in one pass: `[3, 7, 12, 19, 42]`.'
        ],
        correct: 0,
        feedback: 'Correct! Partitioning splits items around the pivot, placing the pivot in its exact final sorted position.',
        errorFeedback: 'No. Partitioning does not fully sort the array; it only arranges elements relative to the pivot.',
        hint: 'Compare elements against 12.',
        action: (viz) => {
          viz.highlightPivot(4);
          setTimeout(() => {
            viz.setArray([7, 3, 12, 19, 42]);
            viz.highlightPivot(2);
            updateTraceDS('PARTITIONS', ['Left: [7,3]', 'Pivot: [12]', 'Right: [19,42]']);
          }, 600);
        }
      },
      {
        text: 'What is Quick Sort\'s worst-case time complexity, and when does it happen?',
        options: [
          'O(N^2), occurring when the array is already sorted and we choose the boundary element as pivot.',
          'O(N log N), occurring on reversed inputs.'
        ],
        correct: 0,
        feedback: 'Exactly! Choosing boundaries as pivots on sorted data yields empty partitions, degrading Quick Sort to O(N^2).',
        errorFeedback: 'Incorrect. O(N log N) is its average case. Worst case is O(N^2) on highly unbalanced partitions.',
        hint: 'Worst case is highly unbalanced tree heights.',
        action: (viz) => {
          viz.setArray([3, 7, 12, 19, 42]);
          updateTraceDS('ARRAY', [3, 7, 12, 19, 42]);
        }
      }
    ]
  }
};

let activeVisualizer = null;

function startMission(missionId) {
  // Check if mission is unlocked
  if (!state.unlockedMissions.includes(missionId)) {
    alert('This mission is locked! Complete previous challenges to unlock.');
    return;
  }

  state.activeMission = missionId;
  state.activeStepIndex = 0;
  state.hintUsedInMission = false;
  state.perfectMission = true;

  // Toggle visible views
  document.getElementById('mission-path-view').classList.add('hidden');
  document.getElementById('mission-play-view').classList.remove('hidden');

  // Load layout elements
  const story = missionStories[missionId];
  document.getElementById('active-mission-title').textContent = `Mission: ${story.title}`;
  document.getElementById('companion-name').textContent = story.companion.name;
  document.getElementById('companion-img').textContent = story.companion.avatar;

  // Setup Visualizer board
  const gRoot = document.getElementById('graph-visualizer-root');
  const mRoot = document.getElementById('maze-visualizer-root');
  const sRoot = document.getElementById('sorting-visualizer-root');

  gRoot.classList.add('hidden');
  mRoot.classList.add('hidden');
  sRoot.classList.add('hidden');

  if (missionId === 'bfs' || missionId === 'dijkstra') {
    gRoot.classList.remove('hidden');
    activeVisualizer = new GraphVisualizer('graph-visualizer-root');
    activeVisualizer.setData(story.nodes, story.edges);

    // Set Legend
    const legend = document.getElementById('workspace-legend');
    legend.innerHTML = `
      <div class="legend-item"><span class="legend-dot" style="background:#86efac"></span>🟢 Current</div>
      <div class="legend-item"><span class="legend-dot" style="background:#bfdbfe"></span>🔵 Visited</div>
      <div class="legend-item"><span class="legend-dot" style="background:#fef08a"></span>🟡 Discovered</div>
      <div class="legend-item"><span class="legend-dot" style="background:#fca5a5"></span>🔴 Destination</div>
    `;
  } else if (missionId === 'dfs') {
    mRoot.classList.remove('hidden');
    activeVisualizer = new MazeVisualizer('maze-visualizer-root');

    // Set Legend
    const legend = document.getElementById('workspace-legend');
    legend.innerHTML = `
      <div class="legend-item">🚀 Start</div>
      <div class="legend-item">🚪 Exit</div>
      <div class="legend-item"><span class="legend-dot" style="background:#475569"></span>🧱 Wall</div>
      <div class="legend-item"><span class="legend-dot" style="background:rgba(14, 165, 233, 0.25)"></span>🔵 Path</div>
    `;
  } else {
    // Sorting missions
    sRoot.classList.remove('hidden');
    activeVisualizer = new SortingVisualizer('sorting-visualizer-root');
    activeVisualizer.setArray(story.array);

    // Set Legend
    const legend = document.getElementById('workspace-legend');
    legend.innerHTML = `
      <div class="legend-item"><span class="legend-dot" style="background:var(--grad-primary)"></span>📦 Element</div>
      <div class="legend-item"><span class="legend-dot" style="background:var(--grad-orange)"></span>🟠 Comparing</div>
      <div class="legend-item"><span class="legend-dot" style="background:var(--grad-green)"></span>🟢 Swapped</div>
    `;
  }

  showDialogueStep();
}

function showDialogueStep() {
  const story = missionStories[state.activeMission];
  const step = story.steps[state.activeStepIndex];

  // Update progress pill
  const progressPercent = Math.round((state.activeStepIndex / story.steps.length) * 100);
  document.getElementById('mission-progress-percent').textContent = `${progressPercent}%`;

  // Dialogue bubble
  document.getElementById('dialogue-text').textContent = step.text;

  // Options box
  const optionsBox = document.getElementById('dialogue-options-box');
  optionsBox.innerHTML = '';
  document.getElementById('dialogue-feedback').classList.add('hidden');
  document.getElementById('mission-hint-box').classList.add('hidden');

  // Trigger optional visualization actions
  if (step.action) {
    step.action(activeVisualizer);
  }

  step.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'opt-btn';
    btn.textContent = opt;
    btn.onclick = () => selectDialogueOption(idx);
    optionsBox.appendChild(btn);
  });

  // Display Hint option if they struggle
  if (step.hint) {
    const hintBtn = document.createElement('button');
    hintBtn.className = 'btn btn-secondary';
    hintBtn.style.marginTop = '10px';
    hintBtn.textContent = '💡 Need a Hint?';
    hintBtn.onclick = () => {
      document.getElementById('mission-hint-text').textContent = step.hint;
      document.getElementById('mission-hint-box').classList.remove('hidden');
      state.hintUsedInMission = true;
      hintBtn.remove();
    };
    optionsBox.appendChild(hintBtn);
  }
}

function selectDialogueOption(selectedIndex) {
  const story = missionStories[state.activeMission];
  const step = story.steps[state.activeStepIndex];

  const feedbackCard = document.getElementById('dialogue-feedback');
  const feedbackIcon = document.getElementById('feedback-icon');
  const feedbackTitle = document.getElementById('feedback-title');
  const feedbackMsg = document.getElementById('feedback-message');

  document.getElementById('dialogue-options-box').innerHTML = '';
  document.getElementById('mission-hint-box').classList.add('hidden');

  feedbackCard.classList.remove('hidden');

  if (selectedIndex === step.correct) {
    feedbackCard.classList.remove('incorrect');
    feedbackIcon.textContent = '🎉';
    feedbackTitle.textContent = 'Correct!';
    feedbackMsg.textContent = step.feedback;

    // Add XP
    const baseXP = 50;
    addXP(baseXP);
  } else {
    feedbackCard.classList.add('incorrect');
    feedbackIcon.textContent = '⚠️';
    feedbackTitle.textContent = 'Not quite!';
    feedbackMsg.textContent = step.errorFeedback;
    state.perfectMission = false;

    // Allow retry button
    const retryBtn = document.getElementById('btn-feedback-next');
    retryBtn.textContent = 'Retry Step ↩️';
    retryBtn.onclick = () => {
      showDialogueStep();
    };
    return;
  }

  // Restore regular progression action
  const nextBtn = document.getElementById('btn-feedback-next');
  nextBtn.textContent = 'Next →';
  nextBtn.onclick = () => advanceDialogue();
}

function advanceDialogue() {
  const story = missionStories[state.activeMission];
  state.activeStepIndex++;

  if (state.activeStepIndex < story.steps.length) {
    showDialogueStep();
  } else {
    // Mission Complete!
    completeActiveMission();
  }
}

function completeActiveMission() {
  const missionId = state.activeMission;

  // XP rewards calculations
  let reward = 100; // completion reward
  if (!state.hintUsedInMission) reward += 100; // Perfect run no hints
  if (state.perfectMission) reward += 150; // Perfect choices

  addXP(reward);

  // Badge mapping
  const badgeMap = {
    bfs: { id: 'bfs', title: 'BFS Beginner', desc: 'Conquered the Connection Finder social network mission.' },
    dfs: { id: 'dfs', title: 'DFS Explorer', desc: 'Escaped the recursive backtracking maze.' },
    dijkstra: { id: 'dijkstra', title: 'Shortest Path Specialist', desc: 'Assisted Dispatch Max with Ambulance paths.' },
    bubble: { id: 'bubble', title: 'Bubble Sort Survivor', desc: 'Resolved warehouse packages bubble swaps.' },
    merge: { id: 'merge', title: 'Divide & Conquer Master', desc: 'Assembled a complete merge sort recursion tree.' },
    quick: { id: 'quick', title: 'Pivot Master', desc: 'Partitioned priority lists using Quick Sort pivots.' }
  };

  const badge = badgeMap[missionId];
  if (badge) {
    unlockBadge(badge.id, badge.title, badge.desc);
  }

  // Unlock next mission sequentially
  const order = ['bfs', 'dfs', 'dijkstra', 'bubble', 'merge', 'quick'];
  const curIndex = order.indexOf(missionId);
  if (curIndex !== -1 && curIndex < order.length - 1) {
    const nextMission = order[curIndex + 1];
    if (!state.unlockedMissions.includes(nextMission)) {
      state.unlockedMissions.push(nextMission);
    }
  }

  alert(`🎉 MISSION COMPLETE!\nYou earned ${reward} XP for finishing the mission!`);
  exitMission();
}

function exitMission() {
  state.activeMission = null;
  document.getElementById('mission-play-view').classList.add('hidden');
  document.getElementById('mission-path-view').classList.remove('hidden');
  initDuoRoadProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateTraceDS(name, items) {
  document.getElementById('trace-ds-name').textContent = name;
  const container = document.getElementById('trace-ds-container');
  container.innerHTML = '';

  items.forEach((item, idx) => {
    const el = document.createElement('div');
    el.className = 'trace-item';
    el.textContent = item;
    container.appendChild(el);

    if (idx < items.length - 1) {
      const arrow = document.createElement('span');
      arrow.className = 'trace-arrow';
      arrow.textContent = '→';
      container.appendChild(arrow);
    }
  });
}

/* ==========================================
   5. LEARN MODE - ALMANAC ARTICLE VIEWER
   ========================================== */
const learnData = {
  bfs: {
    title: 'Breadth-First Search (BFS)',
    summary: 'Breadth-First Search is a fundamental traversal algorithm that explores graph nodes layer by layer. It uses a Queue to maintain order and guarantees finding the shortest path in unweighted graphs.',
    props: { complexity: 'O(V + E)', space: 'O(V)', data: 'Queue (FIFO)' },
    html: `
      <h3 class="learn-h3">Core Concept</h3>
      <p class="learn-p">BFS visits all vertices immediately connected to the source before exploring deeper neighbors. This produces a concentric waves structure, making it ideal for pathfinding problems where step distances are equal (unweighted edges).</p>
      
      <h3 class="learn-h3">Algorithm Pseudocode</h3>
      <pre class="code-panel">
<span class="code-keyword">function</span> <span class="code-func">BFS</span>(graph, startNode):
    let queue = new Queue()
    let visited = new Set()
    
    queue.enqueue(startNode)
    visited.add(startNode)
    
    <span class="code-keyword">while</span> queue is not empty:
        let current = queue.dequeue()
        <span class="code-comment">// Process current node...</span>
        
        <span class="code-keyword">for each</span> neighbor <span class="code-keyword">in</span> graph.neighbors(current):
            <span class="code-keyword">if</span> neighbor is not in visited:
                visited.add(neighbor)
                queue.enqueue(neighbor)</pre>
                
      <h3 class="learn-h3">Real-World Applications</h3>
      <p class="learn-p">Social network connections (degrees of separation), GPS routing engines for hops count, peer-to-peer torrent search queries, and web crawlers index systems.</p>
    `
  },
  dfs: {
    title: 'Depth-First Search (DFS)',
    summary: 'Depth-First Search is a traversal method that dives deep along branches before backtracking. It relies on a Stack (or function call recursion) and is excellent for structural exploration.',
    props: { complexity: 'O(V + E)', space: 'O(H) height', data: 'Stack (LIFO)' },
    html: `
      <h3 class="learn-h3">Core Concept</h3>
      <p class="learn-p">DFS goes down a path as far as possible. When it reaches a dead end, it steps back (backtracks) to the most recent node that has unexplored directions, and repeats. This mimics exploration of complex maze systems.</p>
      
      <h3 class="learn-h3">Algorithm Pseudocode</h3>
      <pre class="code-panel">
<span class="code-keyword">function</span> <span class="code-func">DFS</span>(graph, node, visited):
    visited.add(node)
    <span class="code-comment">// Process current node...</span>
    
    <span class="code-keyword">for each</span> neighbor <span class="code-keyword">in</span> graph.neighbors(node):
        <span class="code-keyword">if</span> neighbor is not in visited:
            <span class="code-func">DFS</span>(graph, neighbor, visited) <span class="code-comment">// Recursive call</span></pre>
            
      <h3 class="learn-h3">Real-World Applications</h3>
      <p class="learn-p">Topological sorting in compiler dependencies, solving puzzle mazes, cycle detection in package manager imports, and evaluation of decision tree structures.</p>
    `
  },
  dijkstra: {
    title: 'Dijkstra\'s Shortest Path',
    summary: 'Dijkstra\'s algorithm computes the shortest path between nodes in a weighted graph (with non-negative edges). It relaxes distances and uses a Priority Queue to select the node with smallest tentative distance.',
    props: { complexity: 'O((V + E) log V)', space: 'O(V)', data: 'Min-Heap' },
    html: `
      <h3 class="learn-h3">Core Concept</h3>
      <p class="learn-p">Dijkstra maintains a list of tentative shortest distances from the source. In each iteration, it selects the unvisited node with the minimum distance, processes its neighbors, and updates (relaxes) their distances if a cheaper path is found.</p>
      
      <h3 class="learn-h3">Algorithm Pseudocode</h3>
      <pre class="code-panel">
<span class="code-keyword">function</span> <span class="code-func">Dijkstra</span>(graph, source):
    let dist = new Table()
    let pq = new PriorityQueue()
    
    <span class="code-keyword">for each</span> node in graph.nodes:
        dist[node] = Infinity
    dist[source] = 0
    pq.insert(source, 0)
    
    <span class="code-keyword">while</span> pq is not empty:
        let current = pq.extractMin()
        
        <span class="code-keyword">for each</span> (neighbor, weight) in graph.adj(current):
            let newDist = dist[current] + weight
            <span class="code-keyword">if</span> newDist &lt; dist[neighbor]:
                dist[neighbor] = newDist <span class="code-comment">// Relaxation</span>
                pq.updatePriority(neighbor, newDist)</pre>
                
      <h3 class="learn-h3">Real-World Applications</h3>
      <p class="learn-p">Network routing protocols (OSPF), map routing apps (Google/Apple Maps) finding paths with different speeds/times, and logistics schedule setups.</p>
    `
  },
  bubble: {
    title: 'Bubble Sort',
    summary: 'Bubble Sort is a basic comparison-based sorting algorithm that repeatedly compares adjacent elements and swaps them if they are in wrong order. It bubbles elements sequentially.',
    props: { complexity: 'O(N^2)', space: 'O(1) auxiliary', data: 'In-place Array' },
    html: `
      <h3 class="learn-h3">Core Concept</h3>
      <p class="learn-p">By comparing adjacent elements, the largest item inevitably gets pushed to the rightmost position on each pass. It is simple to understand but highly inefficient for larger arrays.</p>
      
      <h3 class="learn-h3">Algorithm Pseudocode</h3>
      <pre class="code-panel">
<span class="code-keyword">for</span> i <span class="code-keyword">from</span> 0 <span class="code-keyword">to</span> N-1:
    <span class="code-keyword">for</span> j <span class="code-keyword">from</span> 0 <span class="code-keyword">to</span> N-i-2:
        <span class="code-keyword">if</span> array[j] &gt; array[j+1]:
            swap(array[j], array[j+1])</pre>
            
      <h3 class="learn-h3">Real-World Applications</h3>
      <p class="learn-p">Due to poor complexity, it is rarely used in production, except for teaching sorting principles or tiny inputs where overhead must be minimized.</p>
    `
  },
  merge: {
    title: 'Merge Sort',
    summary: 'Merge Sort is a highly efficient divide-and-conquer algorithm. It recursively splits lists in half, sorts the sub-lists, and merges them back together in linear time.',
    props: { complexity: 'O(N log N)', space: 'O(N) auxiliary', data: 'Array splitting' },
    html: `
      <h3 class="learn-h3">Core Concept</h3>
      <p class="learn-p">Divide: split the array into halves. Conquer: sort the halves recursively. Combine: merge the two sorted halves into a single sorted output array. It offers stable performance bounds.</p>
      
      <h3 class="learn-h3">Algorithm Pseudocode</h3>
      <pre class="code-panel">
<span class="code-keyword">function</span> <span class="code-func">mergeSort</span>(array):
    <span class="code-keyword">if</span> size of array &lt;= 1: <span class="code-keyword">return</span> array
    let mid = size/2
    let left = <span class="code-func">mergeSort</span>(array[0..mid])
    let right = <span class="code-func">mergeSort</span>(array[mid..end])
    <span class="code-keyword">return</span> <span class="code-func">merge</span>(left, right)</pre>
            
      <h3 class="learn-h3">Real-World Applications</h3>
      <p class="learn-p">Used in systems where stable sorting is mandatory (Java\'s Arrays.sort, Python\'s Timsort hybrid), and external sorting of databases too large to fit in RAM.</p>
    `
  },
  quick: {
    title: 'Quick Sort',
    summary: 'Quick Sort is a fast divide-and-conquer partition algorithm. It chooses a pivot, partitions elements into smaller and larger groups, and recursively sorts the sub-arrays.',
    props: { complexity: 'O(N log N) avg', space: 'O(log N) stack', data: 'Array partition' },
    html: `
      <h3 class="learn-h3">Core Concept</h3>
      <p class="learn-p">Quick Sort avoids creating auxiliary arrays. It partition elements in-place around a pivot, then recursively sorts partitions. While its average run is highly optimized, poor pivot selection can degrade it to O(N^2).</p>
      
      <h3 class="learn-h3">Algorithm Pseudocode</h3>
      <pre class="code-panel">
<span class="code-keyword">function</span> <span class="code-func">quickSort</span>(array, low, high):
    <span class="code-keyword">if</span> low &lt; high:
        let pivotIndex = <span class="code-func">partition</span>(array, low, high)
        <span class="code-func">quickSort</span>(array, low, pivotIndex - 1)
        <span class="code-func">quickSort</span>(array, pivotIndex + 1, high)</pre>
            
      <h3 class="learn-h3">Real-World Applications</h3>
      <p class="learn-p">The general-purpose sort algorithm of choice in many programming libraries (C++ std::sort, Javascript V8 array sort for primitive arrays) due to excellent CPU caching and in-place performance.</p>
    `
  }
};

function loadLearnDoc(algoId) {
  const data = learnData[algoId];
  if (!data) return;

  // Update menu active class
  document.querySelectorAll('.learn-menu .menu-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('onclick').includes(algoId)) {
      item.classList.add('active');
    }
  });

  const body = document.getElementById('learn-article-body');
  body.className = 'learn-content-view animate-fade';
  body.innerHTML = `
    <h2 class="learn-title">${data.title}</h2>
    <p class="learn-summary">${data.summary}</p>
    
    <div class="learn-grid-props">
      <div class="prop-card">
        <h4>Time Complexity</h4>
        <p>${data.props.complexity}</p>
      </div>
      <div class="prop-card">
        <h4>Auxiliary Space</h4>
        <p>${data.props.space}</p>
      </div>
    </div>
    
    ${data.html}
  `;
}

/* ==========================================
   6. ALGORITHM LAB (EXPERIMENTATION CANVAS)
   ========================================== */
function onLabAlgoChange() {
  const select = document.getElementById('lab-algo-select');
  const value = select.value;
  state.labAlgo = value;

  const sortSub = document.getElementById('lab-sorting-controls');
  const graphSub = document.getElementById('lab-graph-controls');

  resetLabSimulator();

  if (value === 'bfs' || value === 'dfs' || value === 'dijkstra') {
    sortSub.classList.add('hidden');
    graphSub.classList.remove('hidden');
  } else {
    sortSub.classList.remove('hidden');
    graphSub.classList.add('hidden');
  }

  generateLabInput();
}

function updateLabControlsLabel(type) {
  if (type === 'array-size') {
    const val = document.getElementById('lab-array-size').value;
    document.getElementById('val-array-size').textContent = val;
  } else if (type === 'node-count') {
    const val = document.getElementById('lab-node-count').value;
    document.getElementById('val-node-count').textContent = val;
  } else if (type === 'sim-speed') {
    const speeds = ['Slow', 'Medium', 'Fast'];
    const val = document.getElementById('lab-sim-speed').value;
    document.getElementById('val-sim-speed').textContent = speeds[val - 1];
  }
}

function resetLabSimulator() {
  if (state.labInterval) {
    clearInterval(state.labInterval);
    state.labInterval = null;
  }
  state.labRunning = false;
  document.getElementById('sim-status').className = 'status-pill status-ready';
  document.getElementById('sim-status').textContent = 'Ready';

  // Reset counters
  document.getElementById('counter-time').textContent = '0 ms';
  document.getElementById('counter-ops').textContent = '0';
  document.getElementById('counter-comp').textContent = '0';
  document.getElementById('counter-swaps').textContent = '0';
}

function generateLabInput() {
  resetLabSimulator();
  const renderRoot = document.getElementById('lab-render-root');
  renderRoot.innerHTML = '';

  const algo = state.labAlgo;

  if (algo === 'bfs' || algo === 'dfs' || algo === 'dijkstra') {
    const nodeCount = parseInt(document.getElementById('lab-node-count').value);
    const density = document.getElementById('lab-graph-density').value;

    // Generate random layout coordinates
    const nodes = [];
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const r = 0.35; // radius in percent
      nodes.push({
        id: String.fromCharCode(65 + i), // A, B, C...
        label: String.fromCharCode(65 + i),
        x: 0.5 + Math.cos(angle) * r,
        y: 0.5 + Math.sin(angle) * r,
        state: i === 0 ? 'discovered' : 'unvisited',
        dist: algo === 'dijkstra' ? (i === 0 ? 0 : Infinity) : undefined
      });
    }

    // Connect edges based on density
    const edges = [];
    const connectProb = density === 'low' ? 0.35 : density === 'medium' ? 0.55 : 0.8;

    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        if (Math.random() < connectProb || j === i + 1) { // ensure some connectivity
          edges.push({
            source: nodes[i].id,
            target: nodes[j].id,
            weight: algo === 'dijkstra' ? Math.floor(Math.random() * 8) + 1 : undefined
          });
        }
      }
    }

    state.labData = { nodes, edges };

    activeVisualizer = new GraphVisualizer('lab-render-root');
    activeVisualizer.setData(nodes, edges);
  } else {
    // Generate sorting array
    const size = parseInt(document.getElementById('lab-array-size').value);
    const type = document.getElementById('lab-data-type').value;

    let arr = [];
    if (type === 'random') {
      for (let i = 0; i < size; i++) arr.push(Math.floor(Math.random() * 90) + 10);
    } else if (type === 'nearly-sorted') {
      for (let i = 0; i < size; i++) arr.push(Math.floor((i / size) * 80) + 15);
      // Swap some
      for (let s = 0; s < Math.ceil(size / 6); s++) {
        const idx1 = Math.floor(Math.random() * size);
        const idx2 = Math.floor(Math.random() * size);
        const tmp = arr[idx1];
        arr[idx1] = arr[idx2];
        arr[idx2] = tmp;
      }
    } else if (type === 'reversed') {
      for (let i = size; i > 0; i--) arr.push(Math.floor((i / size) * 80) + 15);
    } else {
      // duplicates
      const pool = [20, 45, 60, 85];
      for (let i = 0; i < size; i++) {
        arr.push(pool[Math.floor(Math.random() * pool.length)]);
      }
    }

    state.labData = arr;
    activeVisualizer = new SortingVisualizer('lab-render-root');
    activeVisualizer.setArray(arr);
  }
}

function runLabAlgorithm() {
  if (state.labRunning) return;
  state.labRunning = true;

  const statusEl = document.getElementById('sim-status');
  statusEl.className = 'status-pill status-running';
  statusEl.textContent = 'Running';

  const speedVal = parseInt(document.getElementById('lab-sim-speed').value);
  const delay = speedVal === 1 ? 800 : speedVal === 2 ? 300 : 80;

  const algo = state.labAlgo;

  if (algo === 'bubble') {
    runBubbleSortLab(delay);
  } else if (algo === 'merge') {
    runMergeSortLab(delay);
  } else if (algo === 'quick') {
    runQuickSortLab(delay);
  } else if (algo === 'bfs') {
    runBfsLab(delay);
  } else if (algo === 'dfs') {
    runDfsLab(delay);
  } else if (algo === 'dijkstra') {
    runDijkstraLab(delay);
  }
}

// 1. Bubble Sort Lab Execution
function runBubbleSortLab(delay) {
  let arr = [...state.labData];
  let i = 0, j = 0;
  let ops = 0, comps = 0, swaps = 0;
  const startTime = performance.now();

  state.labInterval = setInterval(() => {
    if (i < arr.length) {
      if (j < arr.length - i - 1) {
        comps++;
        ops++;
        activeVisualizer.highlightComparing([j, j + 1]);

        if (arr[j] > arr[j + 1]) {
          swaps++;
          ops++;
          const tmp = arr[j];
          arr[j] = arr[j + 1];
          arr[j + 1] = tmp;

          activeVisualizer.swapBlocks(j, j + 1);
        }

        // Remove highlight after swap animation
        const prevJ = j;
        setTimeout(() => {
          activeVisualizer.highlightComparing([prevJ, prevJ + 1], false);
        }, delay * 0.8);

        j++;
      } else {
        j = 0;
        i++;
      }

      // Update counters
      document.getElementById('counter-time').textContent = `${Math.round(performance.now() - startTime)} ms`;
      document.getElementById('counter-ops').textContent = ops;
      document.getElementById('counter-comp').textContent = comps;
      document.getElementById('counter-swaps').textContent = swaps;
    } else {
      clearInterval(state.labInterval);
      state.labRunning = false;
      document.getElementById('sim-status').className = 'status-pill status-done';
      document.getElementById('sim-status').textContent = 'Completed';
    }
  }, delay);
}

// 2. Merge Sort Lab Simulation (Generator-based steps)
function runMergeSortLab(delay) {
  let arr = [...state.labData];
  let ops = 0, comps = 0, swaps = 0;
  const startTime = performance.now();

  function* mergeSortGenerator(start, end) {
    if (start >= end) return;
    const mid = Math.floor((start + end) / 2);
    yield* mergeSortGenerator(start, mid);
    yield* mergeSortGenerator(mid + 1, end);
    yield* mergeGenerator(start, mid, end);
  }

  function* mergeGenerator(start, mid, end) {
    let left = arr.slice(start, mid + 1);
    let right = arr.slice(mid + 1, end + 1);
    let i = 0, j = 0, k = start;

    while (i < left.length && j < right.length) {
      comps++;
      ops++;
      yield { compare: [start + i, mid + 1 + j] };

      if (left[i] <= right[j]) {
        arr[k] = left[i];
        swaps++;
        yield { write: [k, left[i]] };
        i++;
      } else {
        arr[k] = right[j];
        swaps++;
        yield { write: [k, right[j]] };
        j++;
      }
      k++;
    }

    while (i < left.length) {
      arr[k] = left[i];
      swaps++;
      yield { write: [k, left[i]] };
      i++;
      k++;
    }

    while (j < right.length) {
      arr[k] = right[j];
      swaps++;
      yield { write: [k, right[j]] };
      j++;
      k++;
    }
  }

  const gen = mergeSortGenerator(0, arr.length - 1);

  state.labInterval = setInterval(() => {
    const res = gen.next();
    if (!res.done) {
      const step = res.value;
      if (step.compare) {
        activeVisualizer.highlightComparing(step.compare);
        setTimeout(() => activeVisualizer.highlightComparing(step.compare, false), delay * 0.8);
      } else if (step.write) {
        activeVisualizer.updateValue(step.write[0], step.write[1]);
        activeVisualizer.highlightSwapped([step.write[0]]);
        setTimeout(() => activeVisualizer.highlightSwapped([step.write[0]], false), delay * 0.8);
      }

      // Update counters
      document.getElementById('counter-time').textContent = `${Math.round(performance.now() - startTime)} ms`;
      document.getElementById('counter-ops').textContent = ++ops;
      document.getElementById('counter-comp').textContent = comps;
      document.getElementById('counter-swaps').textContent = swaps;
    } else {
      clearInterval(state.labInterval);
      state.labRunning = false;
      document.getElementById('sim-status').className = 'status-pill status-done';
      document.getElementById('sim-status').textContent = 'Completed';
    }
  }, delay);
}

// 3. Quick Sort Lab Simulation
function runQuickSortLab(delay) {
  let arr = [...state.labData];
  let ops = 0, comps = 0, swaps = 0;
  const startTime = performance.now();

  function* quickSortGenerator(low, high) {
    if (low < high) {
      const pIdx = yield* partitionGenerator(low, high);
      yield* quickSortGenerator(low, pIdx - 1);
      yield* quickSortGenerator(pIdx + 1, high);
    }
  }

  function* partitionGenerator(low, high) {
    const pivot = arr[high];
    yield { pivot: high };
    let i = low - 1;

    for (let j = low; j < high; j++) {
      comps++;
      ops++;
      yield { compare: [j, high] };
      if (arr[j] < pivot) {
        i++;
        swaps++;
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
        yield { swap: [i, j] };
      }
    }

    swaps++;
    const tmp = arr[i + 1];
    arr[i + 1] = arr[high];
    arr[high] = tmp;
    yield { swap: [i + 1, high] };

    return i + 1;
  }

  const gen = quickSortGenerator(0, arr.length - 1);

  state.labInterval = setInterval(() => {
    const res = gen.next();
    if (!res.done) {
      const step = res.value;
      if (step.pivot !== undefined) {
        activeVisualizer.highlightPivot(step.pivot);
      } else if (step.compare) {
        activeVisualizer.highlightComparing(step.compare);
        setTimeout(() => activeVisualizer.highlightComparing(step.compare, false), delay * 0.8);
      } else if (step.swap) {
        activeVisualizer.swapBlocks(step.swap[0], step.swap[1]);
        activeVisualizer.highlightSwapped(step.swap);
        setTimeout(() => activeVisualizer.highlightSwapped(step.swap, false), delay * 0.8);
      }

      // Update counters
      document.getElementById('counter-time').textContent = `${Math.round(performance.now() - startTime)} ms`;
      document.getElementById('counter-ops').textContent = ++ops;
      document.getElementById('counter-comp').textContent = comps;
      document.getElementById('counter-swaps').textContent = swaps;
    } else {
      clearInterval(state.labInterval);
      state.labRunning = false;
      document.getElementById('sim-status').className = 'status-pill status-done';
      document.getElementById('sim-status').textContent = 'Completed';
    }
  }, delay);
}

// 4. BFS Graph Lab
function runBfsLab(delay) {
  const { nodes, edges } = state.labData;
  const startId = nodes[0].id;

  let queue = [startId];
  let visited = new Set([startId]);
  let ops = 0;
  const startTime = performance.now();

  state.labInterval = setInterval(() => {
    if (queue.length > 0) {
      const current = queue.shift();
      activeVisualizer.updateNodeState(current, 'current');
      ops++;

      // Find neighbors
      const connectedEdges = edges.filter(e => e.source === current || e.target === current);
      connectedEdges.forEach(edge => {
        const neighbor = edge.source === current ? edge.target : edge.source;
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
          activeVisualizer.updateNodeState(neighbor, 'discovered');
          activeVisualizer.updateEdgeState(edge.source, edge.target, 'highlighted');
          ops++;
        }
      });

      setTimeout(() => {
        activeVisualizer.updateNodeState(current, 'visited');
      }, delay * 0.9);

      // Update counters
      document.getElementById('counter-time').textContent = `${Math.round(performance.now() - startTime)} ms`;
      document.getElementById('counter-ops').textContent = ops;
      document.getElementById('counter-comp').textContent = visited.size;
    } else {
      clearInterval(state.labInterval);
      state.labRunning = false;
      document.getElementById('sim-status').className = 'status-pill status-done';
      document.getElementById('sim-status').textContent = 'Completed';
    }
  }, delay);
}

// 5. DFS Graph Lab
function runDfsLab(delay) {
  const { nodes, edges } = state.labData;
  const startId = nodes[0].id;

  let stack = [startId];
  let visited = new Set();
  let ops = 0;
  const startTime = performance.now();

  state.labInterval = setInterval(() => {
    if (stack.length > 0) {
      const current = stack.pop();

      if (!visited.has(current)) {
        visited.add(current);
        activeVisualizer.updateNodeState(current, 'current');
        ops++;

        // Find neighbors and push to stack
        const connectedEdges = edges.filter(e => e.source === current || e.target === current);
        connectedEdges.forEach(edge => {
          const neighbor = edge.source === current ? edge.target : edge.source;
          if (!visited.has(neighbor)) {
            stack.push(neighbor);
            activeVisualizer.updateNodeState(neighbor, 'discovered');
            activeVisualizer.updateEdgeState(edge.source, edge.target, 'highlighted');
            ops++;
          }
        });

        setTimeout(() => {
          activeVisualizer.updateNodeState(current, 'visited');
        }, delay * 0.9);
      }

      // Update counters
      document.getElementById('counter-time').textContent = `${Math.round(performance.now() - startTime)} ms`;
      document.getElementById('counter-ops').textContent = ops;
      document.getElementById('counter-comp').textContent = visited.size;
    } else {
      clearInterval(state.labInterval);
      state.labRunning = false;
      document.getElementById('sim-status').className = 'status-pill status-done';
      document.getElementById('sim-status').textContent = 'Completed';
    }
  }, delay);
}

// 6. Dijkstra Graph Lab
function runDijkstraLab(delay) {
  const { nodes, edges } = state.labData;
  const startId = nodes[0].id;

  let dist = {};
  let visited = new Set();
  nodes.forEach(n => dist[n.id] = n.id === startId ? 0 : Infinity);

  let ops = 0, relaxations = 0;
  const startTime = performance.now();

  state.labInterval = setInterval(() => {
    // Find unvisited node with min distance
    let current = null;
    let minDist = Infinity;

    nodes.forEach(n => {
      if (!visited.has(n.id) && dist[n.id] < minDist) {
        minDist = dist[n.id];
        current = n.id;
      }
    });

    if (current) {
      activeVisualizer.updateNodeState(current, 'current');
      visited.add(current);
      ops++;

      // Relax neighbors
      const connectedEdges = edges.filter(e => e.source === current || e.target === current);
      connectedEdges.forEach(edge => {
        const neighbor = edge.source === current ? edge.target : edge.source;
        if (!visited.has(neighbor)) {
          const newDist = dist[current] + edge.weight;
          ops++;
          if (newDist < dist[neighbor]) {
            dist[neighbor] = newDist;
            relaxations++;
            activeVisualizer.updateNodeState(neighbor, 'discovered', newDist);
            activeVisualizer.updateEdgeState(edge.source, edge.target, 'highlighted');
          }
        }
      });

      setTimeout(() => {
        activeVisualizer.updateNodeState(current, 'visited');
      }, delay * 0.9);

      // Update counters
      document.getElementById('counter-time').textContent = `${Math.round(performance.now() - startTime)} ms`;
      document.getElementById('counter-ops').textContent = ops;
      document.getElementById('counter-swaps').textContent = relaxations;
    } else {
      clearInterval(state.labInterval);
      state.labRunning = false;
      document.getElementById('sim-status').className = 'status-pill status-done';
      document.getElementById('sim-status').textContent = 'Completed';
    }
  }, delay);
}

/* ==========================================
   7. COMPLEXITY GROWTH PLOTTER
   ========================================== */
function updateComplexitySlider(val) {
  document.getElementById('val-complexity-n').textContent = val;
  document.getElementById('n-label-table').textContent = `N=${val}`;
  renderComplexityChart(parseInt(val));
}

function renderComplexityChart(N) {
  const container = document.getElementById('showdown-bars-container');
  container.innerHTML = '';

  // Calculate raw operations
  const o1 = 1;
  const olog = Math.log2(N);
  const on = N;
  const onlog = N * Math.log2(N);
  const on2 = N * N;

  const values = [
    { key: 'O(1)', val: o1, class: 'o1', label: 'Constant' },
    { key: 'O(log N)', val: olog, class: 'ologn', label: 'Logarithmic' },
    { key: 'O(N)', val: on, class: 'on', label: 'Linear' },
    { key: 'O(N log N)', val: onlog, class: 'onlogn', label: 'Linearithmic' },
    { key: 'O(N²)', val: on2, class: 'on2', label: 'Quadratic' }
  ];

  // Set maximum operation height dynamically
  const maxVal = on2;

  values.forEach(item => {
    const group = document.createElement('div');
    group.className = 'chart-bar-group';

    // Scale height (between 4px and 100%)
    const heightPercent = Math.max((item.val / maxVal) * 100, 2);

    const formattedVal = Math.round(item.val).toLocaleString();

    group.innerHTML = `
      <span class="chart-bar-val">${formattedVal}</span>
      <div class="chart-bar ${item.class}" style="height: ${heightPercent}%"></div>
      <span class="chart-bar-label">${item.key}</span>
      <small style="font-size:9px;color:var(--text-light)">${item.label}</small>
    `;

    container.appendChild(group);
  });

  // Render comparative table
  const tableBody = document.getElementById('showdown-table-body');
  tableBody.innerHTML = `
    <tr>
      <td><strong>Bubble Sort</strong></td>
      <td>O(N^2)</td>
      <td>${Math.round(on2).toLocaleString()} ops</td>
      <td>🔴 Inefficient for size</td>
    </tr>
    <tr>
      <td><strong>Merge Sort</strong></td>
      <td>O(N log N)</td>
      <td>${Math.round(onlog).toLocaleString()} ops</td>
      <td>🟢 Highly Stable & Fast</td>
    </tr>
    <tr>
      <td><strong>Quick Sort (avg)</strong></td>
      <td>O(N log N)</td>
      <td>${Math.round(onlog).toLocaleString()} ops</td>
      <td>🟢 Peak CPU performance</td>
    </tr>
  `;

  // Explanation text
  const expl = document.getElementById('complexity-explanation-text');
  if (N <= 50) {
    expl.textContent = `At N=${N}, quadratic loops are fairly small (${Math.round(on2)} ops). Most algorithms will run in under a few milliseconds.`;
  } else if (N <= 200) {
    expl.textContent = `At N=${N}, the gaps expand. O(N²) requires ${Math.round(on2).toLocaleString()} operations, whereas Merge Sort executes only ${Math.round(onlog).toLocaleString()} operations. Gaps become visual.`;
  } else {
    expl.textContent = `At N=${N}, O(N²) requires a massive ${Math.round(on2).toLocaleString()} operations! Bubble Sort will lag significantly, whereas Merge/Quick Sort remain extremely fast with under ${Math.round(onlog).toLocaleString()} operations.`;
  }
}

/* ==========================================
   8. DECISION ROOM (WHICH ALGORITHM QUIZ)
   ========================================== */
const quizScenarios = [
  {
    title: 'Hospital Patient Locator',
    desc: 'A hospital corridor network connects individual rooms. Every corridor traversal takes exactly the same amount of time. You need to locate the absolute shortest routing path to transport a critical patient.',
    choices: [
      { text: 'Breadth-First Search (BFS)', isCorrect: true, why: 'BFS finds the shortest path in unweighted graphs since edges are of equal distance weights.' },
      { text: 'Depth-First Search (DFS)', isCorrect: false, why: 'DFS goes down pathways recursively and does not guarantee finding the shortest path.' },
      { text: 'Dijkstra\'s Algorithm', isCorrect: false, why: 'Dijkstra works for weighted graphs, but since all corridors are unweighted (equal values), BFS is faster and has less overhead.' },
      { text: 'Bubble Sort', isCorrect: false, why: 'Sorting is for array sorting, not graph navigation.' }
    ]
  },
  {
    title: 'Robotic Vacuum Cleaning',
    desc: 'An automated robot cleaner wants to explore every room in a complex house without memory bloating. It must explore deep into a sector and retreat back to explore forks.',
    choices: [
      { text: 'Dijkstra\'s Algorithm', isCorrect: false, why: 'Dijkstra computes optimal shortest paths, not structural complete traversals.' },
      { text: 'Depth-First Search (DFS)', isCorrect: true, why: 'DFS fits backtracking movement exploration perfectly and consumes minimal memory $O(Depth)$ during complete traversals.' },
      { text: 'Merge Sort', isCorrect: false, why: 'Merge Sort divides arrays; it cannot traverse graphs/houses.' },
      { text: 'Breadth-First Search (BFS)', isCorrect: false, why: 'BFS requires keeping an entire frontier in memory, which would bloat the vacuum\'s RAM capacity.' }
    ]
  },
  {
    title: 'Emergency Medical Dispatch',
    desc: 'An ambulance dispatcher needs to find the fastest travel time across roads with varying traffic speed limits and path weight lengths.',
    choices: [
      { text: 'Breadth-First Search (BFS)', isCorrect: false, why: 'BFS assumes equal edges; it cannot compute travel time changes on weighted roads.' },
      { text: 'Dijkstra\'s Algorithm', isCorrect: true, why: 'Dijkstra calculates shortest paths in weighted graphs containing non-negative edges.' },
      { text: 'Quick Sort', isCorrect: false, why: 'Quick sort sorts arrays, but cannot parse geographic graphs.' }
    ]
  },
  {
    title: 'Database Disk Inventory',
    desc: 'You must sort a massive transaction ledger stored on a hard disk. Memory is very limited, but storage is cheap, and stability is required.',
    choices: [
      { text: 'Bubble Sort', isCorrect: false, why: 'Bubble sort is quadratic O(N^2) and would take ages on a massive database.' },
      { text: 'Merge Sort', isCorrect: true, why: 'Merge Sort is highly stable and works perfectly for external sorting on external disk devices because it divides data into sequential streams.' },
      { text: 'Quick Sort', isCorrect: false, why: 'Quick Sort partition swaps require massive random memory access, which is inefficient and unstable on raw hard disks.' }
    ]
  },
  {
    title: 'Embedded Sensor Microchip',
    desc: 'A tiny embedded microcontroller needs to sort 100 sensor measurements in-place. Extra RAM allocations are strictly prohibited due to hardware limitations.',
    choices: [
      { text: 'Merge Sort', isCorrect: false, why: 'Merge Sort requires O(N) helper memory, which is prohibited on this low-RAM microchip.' },
      { text: 'Quick Sort', isCorrect: true, why: 'Quick Sort partitions values in-place directly inside the array, using minimal O(log N) stack frames.' },
      { text: 'BFS Traversal', isCorrect: false, why: 'BFS is a graph traversal method, not an array sorting algorithm.' }
    ]
  }
];

function resetQuiz() {
  state.quizIndex = 0;
  state.quizScore = 0;
  showQuizQuestion();
}

function showQuizQuestion() {
  const current = quizScenarios[state.quizIndex];

  // Progress Bar
  const progressPercent = ((state.quizIndex) / quizScenarios.length) * 100;
  document.getElementById('quiz-progress-fill').style.width = `${progressPercent}%`;

  document.getElementById('quiz-current-num').textContent = state.quizIndex + 1;
  document.getElementById('quiz-question-title').textContent = current.title;
  document.getElementById('quiz-question-desc').textContent = current.desc;

  const choicesBox = document.getElementById('quiz-choices-box');
  choicesBox.innerHTML = '';
  document.getElementById('quiz-answer-feedback').classList.add('hidden');

  current.choices.forEach((choice, idx) => {
    const card = document.createElement('div');
    card.className = 'choice-card';
    card.textContent = choice.text;
    card.onclick = () => selectQuizAnswer(idx);
    choicesBox.appendChild(card);
  });
}

function selectQuizAnswer(index) {
  const current = quizScenarios[state.quizIndex];
  const choice = current.choices[index];

  const feedbackPanel = document.getElementById('quiz-answer-feedback');
  const feedbackTitle = document.getElementById('quiz-feedback-title');
  const feedbackMsg = document.getElementById('quiz-feedback-msg');

  // Disable option click events
  document.querySelectorAll('.choice-card').forEach((card, idx) => {
    card.onclick = null;
    if (idx === index) {
      card.classList.add('selected');
    }
  });

  feedbackPanel.classList.remove('hidden');

  if (choice.isCorrect) {
    feedbackPanel.className = 'quiz-answer-feedback correct';
    feedbackTitle.textContent = '🎉 Correct Decision!';
    feedbackMsg.textContent = choice.why;
    state.quizScore++;
    addXP(100);
  } else {
    feedbackPanel.className = 'quiz-answer-feedback incorrect';
    feedbackTitle.textContent = '❌ Suboptimal Strategy';
    feedbackMsg.textContent = choice.why;
  }
}

function nextQuizQuestion() {
  state.quizIndex++;
  if (state.quizIndex < quizScenarios.length) {
    showQuizQuestion();
  } else {
    alert(`Decisions Room Completed!\nYou scored ${state.quizScore} out of ${quizScenarios.length} correct.`);
    switchTab('challenge');
  }
}

/* ==========================================
   9. THE FINAL GRAND ARENA
   ========================================== */
const arenaQuestions = [
  {
    text: 'A social network has connections: A-B, A-C, B-D. If we run BFS from Node A, in what order are neighbors dequeued and searched?',
    visual: 'Unweighted friendship lines linking A to B, A to C, B to D.',
    choices: [
      { text: 'A, then C, then B, then D', correct: true },
      { text: 'A, then B, then D, then C', correct: false }
    ],
    why: 'BFS visits level 1 nodes (B and C) first before exploring deep (D).'
  },
  {
    text: 'During Dijkstra, Node D has current tentative dist = 12. We inspect a new path from Node C (dist 4) with edge C-D = 6. What is the relaxed distance to D?',
    visual: 'Table entry: dist[D] = 12. Path link: C (4) ---[weight 6]---> D.',
    choices: [
      { text: '12 (keep current distance)', correct: false },
      { text: '10 (relax distance to 4 + 6 = 10)', correct: true }
    ],
    why: 'Since 10 is shorter than 12, we update (relax) D\'s distance to 10.'
  },
  {
    text: 'If we choose element 20 as pivot for partitions in `[25, 4, 30, 10, 20]`, which sub-problem holds elements smaller than 20?',
    visual: 'Array pivot sorting block: 20.',
    choices: [
      { text: '[4, 10]', correct: true },
      { text: '[25, 30]', correct: false }
    ],
    why: '4 and 10 are less than 20; they are placed in the left partition.'
  },
  {
    text: 'What are the time and auxiliary space complexities of Merge Sort?',
    visual: 'Tree diagram showing splitting splits and merges.',
    choices: [
      { text: 'Time: O(N log N) / Space: O(N)', correct: true },
      { text: 'Time: O(N^2) / Space: O(1)', correct: false }
    ],
    why: 'Merge sort always completes in O(N log N) time, but requires O(N) auxiliary space for merging arrays.'
  }
];

function startFinalChallenge() {
  document.getElementById('arena-start-card').classList.add('hidden');
  document.getElementById('arena-play-card').classList.remove('hidden');

  state.arenaIndex = 0;
  state.arenaScore = 0;
  state.arenaIncorrectCount = 0;
  state.arenaHintsCount = 0;

  showArenaQuestion();
}

function showArenaQuestion() {
  const current = arenaQuestions[state.arenaIndex];

  // Progress Bar
  const progressPercent = ((state.arenaIndex) / arenaQuestions.length) * 100;
  document.getElementById('arena-progress-fill').style.width = `${progressPercent}%`;

  document.getElementById('arena-q-num').textContent = state.arenaIndex + 1;
  document.getElementById('arena-question-text').textContent = current.text;
  document.getElementById('arena-live-score').textContent = state.arenaScore;

  // Set visual representation
  const visualBox = document.getElementById('arena-visual-box');
  visualBox.innerHTML = `<code style="font-family:monospace;font-size:14px;background:#e2e8f0;padding:8px 16px;border-radius:4px">${current.visual}</code>`;

  const optionsContainer = document.getElementById('arena-options-container');
  optionsContainer.innerHTML = '';
  document.getElementById('arena-feedback-box').classList.add('hidden');

  current.choices.forEach((choice, idx) => {
    const btn = document.createElement('div');
    btn.className = 'arena-opt';
    btn.textContent = choice.text;
    btn.onclick = () => selectArenaChoice(idx);
    optionsContainer.appendChild(btn);
  });
}

function selectArenaChoice(index) {
  const current = arenaQuestions[state.arenaIndex];
  const choice = current.choices[index];

  document.querySelectorAll('.arena-opt').forEach((btn, idx) => {
    btn.onclick = null;
    if (idx === index) {
      btn.classList.add('selected');
    }
  });

  const feedbackBox = document.getElementById('arena-feedback-box');
  const feedbackTitle = document.getElementById('arena-feedback-title');
  const feedbackText = document.getElementById('arena-feedback-text');

  feedbackBox.classList.remove('hidden');

  if (choice.correct) {
    feedbackTitle.textContent = '🎉 Correct Answer!';
    feedbackTitle.style.color = 'var(--accent-emerald)';
    feedbackText.textContent = current.why;
    state.arenaScore += 25;
  } else {
    feedbackTitle.textContent = '❌ Suboptimal Choice';
    feedbackTitle.style.color = 'var(--accent-rose)';
    feedbackText.textContent = current.why;
    state.arenaIncorrectCount++;
  }
}

function nextArenaQuestion() {
  state.arenaIndex++;
  if (state.arenaIndex < arenaQuestions.length) {
    showArenaQuestion();
  } else {
    showArenaScorecard();
  }
}

function showArenaScorecard() {
  document.getElementById('arena-play-card').classList.add('hidden');
  document.getElementById('arena-scorecard-card').classList.remove('hidden');

  const totalScore = state.arenaScore; // Max is 100
  document.getElementById('scorecard-percent').textContent = `${totalScore}%`;

  // Calculate specific skills bars
  // 1. Selection score
  const selectionVal = totalScore >= 75 ? 100 : totalScore >= 50 ? 75 : 50;
  document.getElementById('metric-selection-fill').style.width = `${selectionVal}%`;
  document.getElementById('metric-selection-val').textContent = `${selectionVal}%`;

  // 2. Execution pathing
  const executionVal = state.arenaIncorrectCount === 0 ? 100 : state.arenaIncorrectCount === 1 ? 75 : 50;
  document.getElementById('metric-execution-fill').style.width = `${executionVal}%`;
  document.getElementById('metric-execution-val').textContent = `${executionVal}%`;

  // 3. Complexity
  const complexityVal = totalScore >= 75 ? 100 : 50;
  document.getElementById('metric-complexity-fill').style.width = `${complexityVal}%`;
  document.getElementById('metric-complexity-val').textContent = `${complexityVal}%`;

  // 4. Hints & Speed
  const hintsVal = state.arenaHintsCount === 0 ? 100 : 50;
  document.getElementById('metric-hints-fill').style.width = `${hintsVal}%`;
  document.getElementById('metric-hints-val').textContent = `${hintsVal}%`;

  // Award Title
  const titleText = document.getElementById('scorecard-title-text');
  const descText = document.getElementById('scorecard-eval-desc');

  if (totalScore >= 85) {
    titleText.textContent = 'ALGORITHM STRATEGIST';
    descText.textContent = 'Excellent! You demonstrated deep comprehension of graph structures, shortest routes, sorting partitions, and performance constraints. Professor Algo salutes you!';
    unlockBadge('strategist', 'Algorithm Strategist', 'Score 85%+ on the Grand Arena Final Evaluation.');
  } else if (totalScore >= 60) {
    titleText.textContent = 'COMPUTATIONAL EXPLORER';
    descText.textContent = 'Good job. You understand most basic algorithms, but could refine edge relaxation details and pivot selection scenarios in the Algorithm Lab.';
  } else {
    titleText.textContent = 'ARENA RECRUIT';
    descText.textContent = 'Keep practicing! Review pseudocode cards in Learn Mode, and run visualizer steps in Story Mode to master the concepts.';
  }

  // Grant bonus completion XP
  addXP(200);
}

function restartArena() {
  document.getElementById('arena-scorecard-card').classList.add('hidden');
  document.getElementById('arena-start-card').classList.remove('hidden');
}
