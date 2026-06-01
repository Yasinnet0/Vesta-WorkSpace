import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide, forceX, forceY } from 'd3-force';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Plus, RefreshCw, X, HelpCircle, FileText, CheckSquare, Lightbulb, Bookmark, Trash2, AlertTriangle, Play, Pause } from 'lucide-react';
import { 
  getNodes, getLinks, addLink, 
  getTasks, getIdeas, getBookmarks, getNotes,
  updateNode, addNode, updateNodesBatch,
  deleteNode, deleteLink
} from '../api';

import CreateNodeModal from '../components/Graph/CreateNodeModal';
import NodeEditor from '../components/Graph/NodeEditor';
import LinkEditor from '../components/Graph/LinkEditor';
import GraphControls from '../components/Graph/GraphControls';
import { getCategoryColor } from '../utils/categoryHelpers';
import CategoryCombobox from '../components/Shared/CategoryCombobox';

// HSL premium curated colors
const COLORS = {
  custom: '#f59e0b',    // Standalone custom nodes (Amber)
  note: '#8b5cf6',      // Main docs/notes (Purple)
  idea: '#10b981',      // Ideas (Emerald)
  task: '#f43f5e',      // Tasks (Rose)
  bookmark: '#3b82f6',  // Bookmarks (Blue)
  link: 'rgba(255, 255, 255, 0.24)',
  linkHighlight: 'rgba(255, 255, 255, 0.75)',
  particle: '#60a5fa'
};

const GraphView = () => {
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const isDragging = useRef(false);

  const activeTheme = localStorage.getItem('vesta-theme') || 'carbon';
  const themeBackgrounds = {
    carbon: '#0c0e17',
    plasma: '#080612',
    matrix: '#040706'
  };
  const currentBgColor = themeBackgrounds[activeTheme] || '#0c0e17';
  const draggedNodeRef = useRef(null);

  // Core visual data
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);

  // Raw entities lists
  const [rawNodesRecords, setRawNodesRecords] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Simulation stable toggle
  const isLayoutStable = useRef(false);

  // Interactivity states
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedLink, setSelectedLink] = useState(null);
  const [hoverNode, setHoverNode] = useState(null);
  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [nodeToDelete, setNodeToDelete] = useState(null);

  // Visual Connect Mode State
  const [connectMode, setConnectMode] = useState(false);
  const [linkSourceNode, setLinkSourceNode] = useState(null);

  // Modals & Panels
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newNodeCoords, setNewNodeCoords] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    custom: true,
    note: true,
    task: true,
    idea: true,
    bookmark: true
  });

  // Timeline Evolution state
  const [selectedDate, setSelectedDate] = useState(null);
  const [minDate, setMinDate] = useState(null);
  const [maxDate, setMaxDate] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Physics customization (Cyber-graph defaults)
  const [physics, setPhysics] = useState({
    chargeStrength: -240,
    linkDistance: 80,
    nodeScale: 6.0,
    velocityDecay: 0.65,
    showLabels: true,
    showParticles: true
  });

  // Group Lasso Selection States
  const [lassoStart, setLassoStart] = useState(null); // Screen coordinates: { x, y }
  const [lassoEnd, setLassoEnd] = useState(null); // Screen coordinates: { x, y }
  const [isLassoing, setIsLassoing] = useState(false);
  const [selectedLassoNodes, setSelectedLassoNodes] = useState(new Set());

  // Reactive unique categories memo from current nodes
  const uniqueCategories = useMemo(() => {
    return ['General', ...new Set(nodes.map(n => n.category))].filter(Boolean);
  }, [nodes]);

  // Load only user-added nodes and unify them with database records
  const loadGraphData = useCallback(async () => {
    try {
      setLoading(true);
      isLayoutStable.current = false;

      const [nodesRes, linksRes, tasksRes, ideasRes, bookmarksRes, notesRes] = await Promise.all([
        getNodes().catch(() => ({ data: [] })),
        getLinks().catch(() => ({ data: [] })),
        getTasks().catch(() => ({ data: [] })),
        getIdeas().catch(() => ({ data: [] })),
        getBookmarks().catch(() => ({ data: [] })),
        getNotes().catch(() => ({ data: [] }))
      ]);

      setRawNodesRecords(nodesRes.data || []);
      setTasks(tasksRes.data || []);

      // Build unified nodes list ONLY from explicitly added nodes inside the nodes table
      const activeNodes = (nodesRes.data || []).map(nodeRecord => {
        // Find the linked entity if any
        let linkedItem = null;
        if (nodeRecord.linkedEntityId) {
          const linkedId = String(nodeRecord.linkedEntityId);
          if (nodeRecord.type === 'note') {
            linkedItem = (notesRes.data || []).find(x => String(x.id) === linkedId);
          } else if (nodeRecord.type === 'idea') {
            linkedItem = (ideasRes.data || []).find(x => String(x.id) === linkedId);
          } else if (nodeRecord.type === 'task') {
            linkedItem = (tasksRes.data || []).find(x => String(x.id) === linkedId);
          } else if (nodeRecord.type === 'bookmark') {
            linkedItem = (bookmarksRes.data || []).find(x => String(x.id) === linkedId);
          }
        }

        // Unify fields safely
        return {
          ...nodeRecord,
          id: String(nodeRecord.id), // Unique node ID based on nodes table record ID
          title: nodeRecord.type === 'custom' 
            ? (nodeRecord.title || 'Untitled Node')
            : (linkedItem ? (linkedItem.title || linkedItem.text || linkedItem.domain || nodeRecord.title) : (nodeRecord.title || 'Untitled Node')),
          notes: nodeRecord.type === 'custom'
            ? (nodeRecord.notes || '')
            : (linkedItem ? (linkedItem.content || nodeRecord.notes || '') : (nodeRecord.notes || '')),
          category: nodeRecord.type === 'custom'
            ? (nodeRecord.category || 'General')
            : (linkedItem ? (linkedItem.category || linkedItem.list || 'General') : (nodeRecord.category || 'General')),
          completed: nodeRecord.type === 'task' ? !!linkedItem?.completed : false,
          priority: nodeRecord.type === 'task' ? (linkedItem?.priority || 'medium') : 'medium',
          dueDate: nodeRecord.type === 'task' ? (linkedItem?.dueDate || null) : null,
          created: nodeRecord.created || linkedItem?.created || null,
          nodeRecordId: nodeRecord.id,
          x: nodeRecord.x !== null ? nodeRecord.x : undefined,
          y: nodeRecord.y !== null ? nodeRecord.y : undefined
        };
      });

      // Format links safely
      const processedLinks = (linksRes.data || [])
        .filter(l => l && l.source && l.target)
        .map(l => ({
          ...l,
          id: String(l.id),
          source: String(l.source?.id || l.source),
          target: String(l.target?.id || l.target)
        }));

      // Preserve current coordinates and velocities of existing nodes to prevent jumps/drifts when reloading data
      const existingNodesMap = new Map();
      if (graphRef.current && typeof graphRef.current.graphData === 'function') {
        const currentD3Nodes = graphRef.current.graphData()?.nodes || [];
        currentD3Nodes.forEach(n => {
          existingNodesMap.set(String(n.id), n);
        });
      }

      // Ensure nodes don't have fx/fy pinned by default to allow D3 fluid physics and organic push-away collision resolution
      activeNodes.forEach(node => {
        node.fx = null;
        node.fy = null;

        // If the node already exists in the active simulation, preserve its exact current position and velocity!
        const match = existingNodesMap.get(String(node.id));
        if (match) {
          node.x = match.x;
          node.y = match.y;
          node.vx = match.vx;
          node.vy = match.vy;
        }
      });

      setNodes(activeNodes);
      setLinks(processedLinks);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to download graph elements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraphData();
  }, [loadGraphData]);

  // Calculate date range from nodes
  useEffect(() => {
    if (nodes.length > 0) {
      const timestamps = nodes
        .map(n => n.created ? new Date(n.created).getTime() : null)
        .filter(t => t !== null && !isNaN(t));
      
      if (timestamps.length > 0) {
        const minVal = Math.min(...timestamps);
        const maxVal = Math.max(...timestamps);
        setMinDate(minVal);
        setMaxDate(maxVal);
        setSelectedDate(prev => {
          if (prev === null || prev === maxDate) {
            return maxVal;
          }
          return prev;
        });
      } else {
        const now = Date.now();
        const sevenDaysAgo = now - 7 * 86400000;
        setMinDate(sevenDaysAgo);
        setMaxDate(now);
        setSelectedDate(now);
      }
    } else {
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 86400000;
      setMinDate(sevenDaysAgo);
      setMaxDate(now);
      setSelectedDate(now);
    }
  }, [nodes]);

  // Playback timer effect (steps through active timeline blocks)
  useEffect(() => {
    let timer = null;
    if (isPlaying && minDate && maxDate) {
      timer = setInterval(() => {
        setSelectedDate(current => {
          if (current === null || current >= maxDate) {
            setIsPlaying(false);
            return maxDate;
          }
          const totalDuration = maxDate - minDate;
          const stepSize = Math.max(86400000, totalDuration / 15); // steps through ~15 distinct visual increments
          const nextVal = current + stepSize;
          if (nextVal >= maxDate) {
            setIsPlaying(false);
            return maxDate;
          }
          return nextVal;
        });
      }, 850);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, minDate, maxDate]);

  // Adjust simulation physics to achieve Cyber-graph-like stability and fluid layout
  useEffect(() => {
    if (graphRef.current && !loading) {
      try {
        const fg = graphRef.current;

        // 1. Remove standard center force which causes collective node shifting
        fg.d3Force('center', null);

        // 2. Add weak gravity towards the viewport center (Cyber-graph style)
        // This keeps the graph centered without shifting other nodes when one is dragged
        fg.d3Force('x', forceX(dimensions.width / 2).strength(0.04));
        fg.d3Force('y', forceY(dimensions.height / 2).strength(0.04));

        // 3. Configure many-body repulsion (charge)
        const charge = fg.d3Force('charge');
        if (charge) {
          charge.strength(physics.chargeStrength).distanceMax(250);
        }

        // 4. Configure elastic links
        const linkForce = fg.d3Force('link');
        if (linkForce) {
          linkForce.distance(physics.linkDistance).strength(0.35);
        }

        // 5. Add strict collision force to completely prevent overlapping (Cyber-graph style)
        fg.d3Force('collision', forceCollide(node => physics.nodeScale * 3.2).iterations(4));

        // 6. Set velocity decay for smooth organic motion
        if (typeof fg.d3VelocityDecay === 'function') {
          fg.d3VelocityDecay(physics.velocityDecay);
        }
      } catch (err) {
        console.warn('Failed to configure Cyber-graph-style graph forces:', err);
      }
    }
  }, [loading, physics.chargeStrength, physics.linkDistance, physics.nodeScale, physics.velocityDecay, dimensions.width, dimensions.height]);



  // Update bounds on resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth || 800,
          height: containerRef.current.clientHeight || 600
        });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Path highlight on hover
  useEffect(() => {
    if (!hoverNode || isDragging.current) {
      setHighlightNodes(new Set());
      setHighlightLinks(new Set());
      return;
    }

    const hNodes = new Set();
    const hLinks = new Set();
    
    hNodes.add(hoverNode.id);

    links.forEach(l => {
      if (!l) return;
      const s = l.source?.id || l.source;
      const t = l.target?.id || l.target;
      if (s === hoverNode.id) {
        hNodes.add(t);
        hLinks.add(l);
      } else if (t === hoverNode.id) {
        hNodes.add(s);
        hLinks.add(l);
      }
    });

    setHighlightNodes(hNodes);
    setHighlightLinks(hLinks);
  }, [hoverNode, links]);

  // Keyboard shortcut listener to delete selected node
  useEffect(() => {
    const handleKeyDown = async (event) => {
      if (!selectedNode) return;

      // Do not delete if user is currently typing in an input or textarea
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        setNodeToDelete(selectedNode);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode]);

  // Execute deletion callback
  const executeNodeDelete = useCallback(async (targetNode) => {
    if (!targetNode) return;
    try {
      // 1. Sever all associated links in links.json
      const associatedLinks = links.filter(l => {
        if (!l) return false;
        const s = l.source?.id || l.source;
        const t = l.target?.id || l.target;
        return s === targetNode.id || t === targetNode.id;
      });

      for (const link of associatedLinks) {
        await deleteLink(link.id).catch(() => {});
      }

      // 2. Delete/Unlink the node
      if (targetNode.type === 'custom') {
        await deleteNode(targetNode.id);
      } else if (targetNode.nodeRecordId) {
        await deleteNode(targetNode.nodeRecordId);
      }

      // If we are currently editing the deleted node, close the editor
      if (selectedNode && selectedNode.id === targetNode.id) {
        setSelectedNode(null);
      }

      setNodeToDelete(null);
      await loadGraphData();
    } catch (err) {
      console.warn('Failed to delete node:', err);
    }
  }, [links, selectedNode, loadGraphData]);

  // Handle keypresses (Enter to confirm, Escape to cancel) when delete modal is open
  useEffect(() => {
    if (!nodeToDelete) return;

    const handleConfirmKeyDown = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        executeNodeDelete(nodeToDelete);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setNodeToDelete(null);
      }
    };

    window.addEventListener('keydown', handleConfirmKeyDown);
    return () => window.removeEventListener('keydown', handleConfirmKeyDown);
  }, [nodeToDelete, executeNodeDelete]);

  // Click handler
  const handleNodeClick = useCallback(async (node) => {
    if (!node) return;

    if (connectMode) {
      if (!linkSourceNode) {
        setLinkSourceNode(node);
      } else {
        if (linkSourceNode.id !== node.id) {
          try {
            await addLink({ source: linkSourceNode.id, target: node.id });
            await loadGraphData();
          } catch (err) {
            console.error('Failed to link nodes:', err);
          }
        }
        setLinkSourceNode(null);
        setConnectMode(false);
      }
    } else {
      setSelectedNode(node);
      setSelectedLink(null);
      // Zoom and center camera
      if (graphRef.current) {
        try {
          if (typeof graphRef.current.centerAt === 'function') {
            graphRef.current.centerAt(node.x, node.y, 700);
          }
          if (typeof graphRef.current.zoom === 'function') {
            graphRef.current.zoom(2.6, 700);
          }
        } catch {}
      }
    }
  }, [connectMode, linkSourceNode, loadGraphData]);

  // Link Click handler
  const handleLinkClick = useCallback((link) => {
    if (!link) return;
    setSelectedLink(link);
    setSelectedNode(null);
  }, []);

  // Drag handlers (Dynamic bouncy fluid physics with native D3 collision push-away)
  const handleNodeDragStart = (node) => {
    isDragging.current = true;
    draggedNodeRef.current = node; // Lock reference to the active dragged node
    setHoverNode(null);
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
    
    // Capture starting coordinates for all nodes in lasso cluster
    if (selectedLassoNodes.has(String(node.id))) {
      groupDragStartCoords.current.clear();
      selectedLassoNodes.forEach(id => {
        const n = nodes.find(x => String(x.id) === String(id));
        if (n) {
          groupDragStartCoords.current.set(String(id), { x: n.x, y: n.y });
        }
      });
    } else {
      groupDragStartCoords.current.clear();
    }
    
    const fg = graphRef.current;
    if (fg) {
      try {
        // 1. Keep simulation active and running extremely hot during dragging
        if (typeof fg.d3AlphaTarget === 'function') {
          fg.d3AlphaTarget(0.45); // High target keeps simulation highly reactive
        }

        // 2. Set low friction decay for ultra-smooth fluid movement
        if (typeof fg.d3VelocityDecay === 'function') {
          fg.d3VelocityDecay(0.12); // Lower decay allows nodes to move away gracefully and quickly
        }

        // 3. Make collision force extremely strict and immediate by increasing iterations and radius
        const collisionForce = fg.d3Force('collision');
        if (collisionForce) {
          // Boost collision radius and iteration count (12x) to completely prevent overlapping/clipping
          collisionForce.radius(n => physics.nodeScale * (n.id === node.id ? 3.8 : 2.5)).iterations(12);
        }

        // 4. Boost charge repulsion temporarily so other nodes run away elegantly
        const chargeForce = fg.d3Force('charge');
        if (chargeForce) {
          chargeForce.strength(physics.chargeStrength * 2.5).distanceMax(300); // 2.5x stronger repulsion
        }

        // 5. Reheat the simulation to make the drag transition fluid
        if (typeof fg.d3ReheatSimulation === 'function') {
          fg.d3ReheatSimulation();
        }
      } catch (err) {
        console.warn('Failed to prepare forces on drag start:', err);
      }
    }
  };

  const handleNodeDrag = (node) => {
    if (!node) return;
    
    // Cluster dragging translation
    if (selectedLassoNodes.has(String(node.id)) && groupDragStartCoords.current.has(String(node.id))) {
      const startCoords = groupDragStartCoords.current.get(String(node.id));
      const dx = node.x - startCoords.x;
      const dy = node.y - startCoords.y;
      
      // Shift all lassoed nodes by the offset
      selectedLassoNodes.forEach(id => {
        const n = nodes.find(x => String(x.id) === String(id));
        const s = groupDragStartCoords.current.get(String(id));
        if (n && s) {
          n.x = s.x + dx;
          n.y = s.y + dy;
          n.fx = n.x;
          n.fy = n.y;
        }
      });
    } else {
      // Follow the mouse pointer exactly
      node.fx = node.x;
      node.fy = node.y;
    }
  };

  // Save new node coordinates to backend when dragging completes!
  const handleNodeDragEnd = async (node) => {
    isDragging.current = false;
    draggedNodeRef.current = null; // Reset reference
    if (!node) return;

    node.fx = null;
    node.fy = null;

    const fg = graphRef.current;

    // 1. Cool down the simulation naturally and restore original friction decay
    if (fg) {
      try {
        if (typeof fg.d3AlphaTarget === 'function') {
          fg.d3AlphaTarget(0);
        }

        if (typeof fg.d3VelocityDecay === 'function') {
          fg.d3VelocityDecay(physics.velocityDecay);
        }

        // Restore normal collision forces
        const collisionForce = fg.d3Force('collision');
        if (collisionForce) {
          collisionForce.radius(n => physics.nodeScale * 3.2).iterations(4);
        }

        // Restore normal charge force
        const chargeForce = fg.d3Force('charge');
        if (chargeForce) {
          chargeForce.strength(physics.chargeStrength).distanceMax(250);
        }
      } catch (err) {
        console.warn('Failed to restore forces on drag end:', err);
      }
    }

    // 2. Unpin all simulation node objects directly (ensuring they float dynamically)
    const d3Nodes = typeof fg?.graphData === 'function' ? fg.graphData()?.nodes || [] : [];
    d3Nodes.forEach(d3Node => {
      d3Node.fx = null;
      d3Node.fy = null;
    });

    // 3. Prepare batch updates for database synchronization
    const batchUpdates = [];
    const isClusterDrag = selectedLassoNodes.has(String(node.id));

    if (isClusterDrag) {
      // Gather all selected nodes coordinates
      selectedLassoNodes.forEach(id => {
        const n = nodes.find(x => String(x.id) === String(id));
        const d3Node = d3Nodes.find(x => String(x.id) === String(id));
        if (n && d3Node) {
          n.x = d3Node.x;
          n.y = d3Node.y;
          const recordId = n.nodeRecordId || (n.type === 'custom' ? n.id : null);
          if (recordId) {
            batchUpdates.push({
              id: recordId,
              x: d3Node.x,
              y: d3Node.y,
              pinned: false
            });
          }
        }
      });
    } else {
      const draggedNodeRecordId = node.nodeRecordId;
      if (draggedNodeRecordId) {
        batchUpdates.push({
          id: draggedNodeRecordId,
          x: node.x,
          y: node.y,
          pinned: false
        });
      } else if (node.type === 'custom') {
        batchUpdates.push({
          id: node.id,
          x: node.x,
          y: node.y,
          pinned: false
        });
      }
    }

    // Sync any other nodes whose coordinates drift/change due to simulation push
    const updatedNodes = nodes.map(n => {
      const d3Node = d3Nodes.find(x => String(x.id) === String(n.id));
      if (d3Node) {
        const isPartOffset = isClusterDrag ? selectedLassoNodes.has(String(n.id)) : String(n.id) === String(node.id);
        const coordinatesChanged = Math.abs(n.x - d3Node.x) > 0.1 || Math.abs(n.y - d3Node.y) > 0.1;

        if (coordinatesChanged && !isPartOffset) {
          const recordId = n.nodeRecordId || (n.type === 'custom' ? n.id : null);
          if (recordId) {
            batchUpdates.push({
              id: recordId,
              x: d3Node.x,
              y: d3Node.y,
              pinned: false
            });
          }
        }

        return {
          ...n,
          x: d3Node.x,
          y: d3Node.y,
          fx: null,
          fy: null
        };
      }
      return n;
    });
    setNodes(updatedNodes);

    // Save batch to database in one atomic request!
    if (batchUpdates.length > 0) {
      try {
        await updateNodesBatch(batchUpdates);
      } catch (err) {
        console.warn('Failed to save batch node coordinates:', err);
      }
    }

    // Handle new non-custom nodes that need an entry added to nodes table
    if (isClusterDrag) {
      // Create entries for any selected node without nodeRecordId
      for (const id of Array.from(selectedLassoNodes)) {
        const n = nodes.find(x => String(x.id) === String(id));
        if (n && !n.nodeRecordId && n.type !== 'custom') {
          try {
            const res = await addNode({
              title: n.title,
              type: n.type,
              notes: '',
              linkedEntityId: n.id,
              x: n.x,
              y: n.y,
              pinned: false,
              category: n.category || 'General'
            });
            n.nodeRecordId = res.data.id;
            setNodes(prev => prev.map(item => String(item.id) === String(id) ? { ...item, nodeRecordId: res.data.id } : item));
          } catch (err) {
            console.warn('Failed to add new node record in cluster drag end:', err);
          }
        }
      }
    } else {
      if (!node.nodeRecordId && node.type !== 'custom') {
        try {
          const res = await addNode({
            title: node.title,
            type: node.type,
            notes: '',
            linkedEntityId: node.id,
            x: node.x,
            y: node.y,
            pinned: false,
            category: node.category || 'General'
          });
          const newRecordId = res.data.id;
          node.nodeRecordId = newRecordId;
          setNodes(prevNodes => prevNodes.map(n => 
            String(n.id) === String(node.id) ? { ...n, nodeRecordId: newRecordId, fx: null, fy: null } : n
          ));
        } catch (err) {
          console.warn('Failed to add new node record on drag end:', err);
        }
      }
    }

    // Gently reheat simulation to settle any pushed nodes
    if (fg && typeof fg.d3ReheatSimulation === 'function') {
      try {
        fg.d3ReheatSimulation();
      } catch {}
    }
  };



  // Reset cameras
  const resetCamera = () => {
    if (graphRef.current) {
      try {
        if (typeof graphRef.current.zoomToFit === 'function') {
          graphRef.current.zoomToFit(800, 60);
        }
      } catch {}
    }
  };

  // Dynamic helper to identify link types in the active simulation
  const getLinkType = useCallback((l) => {
    if (!l || !l.source || !l.target) return 'regular';
    const sId = l.source?.id || l.source;
    const tId = l.target?.id || l.target;
    const sNode = nodes.find(n => n.id === sId);
    const tNode = nodes.find(n => n.id === tId);
    
    if (sNode && tNode) {
      if (sNode.type === 'task' && tNode.type === 'task') return 'dependency';
      if (sNode.type === 'task' || tNode.type === 'task') return 'action';
    }
    return 'regular';
  }, [nodes]);

  // High fidelity canvas drawing callback
  const paintNode = useCallback((node, ctx, globalScale) => {
    if (!node || !ctx) return;

    // Check if task is completed
    let isTaskCompleted = false;
    if (node.type === 'task') {
      isTaskCompleted = !!node.completed;
    }

    const isHighlighted = highlightNodes.has(node.id) || (linkSourceNode && linkSourceNode.id === node.id);
    const isSel = selectedNode && selectedNode.id === node.id;
    const isHovered = hoverNode && hoverNode.id === node.id;
    const isDimmed = (highlightNodes.size > 0 && !isHighlighted) || (selectedNode && !isHighlighted && !isSel && highlightNodes.size > 0);
    
    const size = physics.nodeScale * (isSel ? 1.55 : isHighlighted ? 1.28 : 1.0);
    
    // Fetch deterministic type-based premium color
    const color = COLORS[node.type] || COLORS.custom;

    ctx.save();

    // 1. Hover Crawling Dashed Orbit / Focus Shield
    if (isHovered && !isDragging.current) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.1;
      ctx.globalAlpha = isDimmed ? 0.3 : 0.85;
      ctx.setLineDash([4.5, 3]);
      ctx.lineDashOffset = -Date.now() / 32; // smooth clock crawl
      ctx.beginPath();
      ctx.arc(node.x, node.y, size + 7.5, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]); // clear line dashes immediately
      ctx.globalAlpha = 1.0;
    }

    // 2. High Priority Task Pulsing Halo
    if (node.type === 'task' && node.priority === 'high' && !isTaskCompleted) {
      const pulse = Math.sin(Date.now() / 150) * 0.28 + 0.72; // elegant pulse curve
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.25;
      ctx.globalAlpha = pulse * (isDimmed ? 0.2 : 0.85);
      ctx.beginPath();
      ctx.arc(node.x, node.y, size + 4.5, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }

    // 3. Glow highlight halos
    if (isSel || isHighlighted) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
    }

    // 3.5. Group Lasso Glowing Ring Highlight
    const isLassoSelected = selectedLassoNodes.has(String(node.id));
    if (isLassoSelected) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(node.x, node.y, size + 4.5, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow blur immediately
    }

    // 4. Outer capsule translucent layer
    ctx.beginPath();
    ctx.arc(node.x, node.y, size + 2.5, 0, 2 * Math.PI, false);
    ctx.fillStyle = isDimmed ? 'rgba(255,255,255,0.005)' : 'rgba(255,255,255,0.04)';
    ctx.fill();

    // 5. Node visual core solid circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.globalAlpha = isDimmed ? 0.12 : isTaskCompleted ? 0.40 : 1.0;
    ctx.fill();

    // 6. White outline for selected nodes
    if (isSel) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(0.7, 2.2 / (globalScale || 1));
      ctx.stroke();
    }

    // 7. Sleek Completed Task Indicator (Minimalist & Clean)
    if (!isDimmed && node.type === 'task' && isTaskCompleted && size >= 5) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(node.x - size * 0.25, node.y - size * 0.05);
      ctx.lineTo(node.x - size * 0.05, node.y + size * 0.15);
      ctx.lineTo(node.x + size * 0.25, node.y - size * 0.15);
      ctx.stroke();
    }

    // 8. Node labels
    if (physics.showLabels) {
      const scale = globalScale || 1;
      if (scale > 1.1 || isHighlighted || isSel) {
        const fontSize = Math.max(3.8, 10.5 / scale);
        ctx.font = `${fontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowBlur = 0; // clear text glow

        let textLabel = node.title || 'Untitled Node';
        if (textLabel.length > 20) {
          textLabel = textLabel.substring(0, 18) + '...';
        }

        ctx.fillStyle = isDimmed 
          ? 'rgba(255,255,255,0.06)' 
          : isTaskCompleted 
            ? 'rgba(255,255,255,0.22)' 
            : 'rgba(255,255,255,0.85)';
        
        ctx.fillText(textLabel, node.x, node.y + size + 3);

        // Task completed strike-through line
        if (isTaskCompleted && !isDimmed) {
          const textWidth = ctx.measureText(textLabel).width;
          ctx.beginPath();
          ctx.moveTo(node.x - textWidth / 2, node.y + size + 3 + (fontSize / 2));
          ctx.lineTo(node.x + textWidth / 2, node.y + size + 3 + (fontSize / 2));
          ctx.strokeStyle = 'rgba(255,255,255,0.25)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }, [highlightNodes, selectedNode, linkSourceNode, hoverNode, physics.nodeScale, physics.showLabels, nodes, selectedLassoNodes]);

  // Double click coordinates converter
  const handleBackgroundDoubleClick = (event) => {
    if (graphRef.current && containerRef.current) {
      try {
        const rect = containerRef.current.getBoundingClientRect();
        const mX = event.clientX - rect.left;
        const mY = event.clientY - rect.top;
        if (typeof graphRef.current.screen2GraphCoords === 'function') {
          const coords = graphRef.current.screen2GraphCoords(mX, mY);
          setNewNodeCoords(coords);
          setIsCreateModalOpen(true);
        }
      } catch (err) {
        console.warn("Grid coordinate mapping warning:", err);
      }
    }
  };

  // Group drag offset mapping
  const groupDragStartCoords = useRef(new Map());

  // Lasso mouse down handler
  const handleMouseDown = (e) => {
    if (e.shiftKey) {
      e.preventDefault();
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setLassoStart({ x, y });
      setLassoEnd({ x, y });
      setIsLassoing(true);
      setSelectedLassoNodes(new Set());
    }
  };

  // Track lasso drag movement
  useEffect(() => {
    if (!isLassoing) return;

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      setLassoEnd({ x, y });
    };

    const handleMouseUp = () => {
      setIsLassoing(false);
      
      if (lassoStart && lassoEnd && containerRef.current) {
        const xMin = Math.min(lassoStart.x, lassoEnd.x);
        const xMax = Math.max(lassoStart.x, lassoEnd.x);
        const yMin = Math.min(lassoStart.y, lassoEnd.y);
        const yMax = Math.max(lassoStart.y, lassoEnd.y);

        // Map D3 coordinates into screen space and verify bounds
        const fg = graphRef.current;
        if (fg && typeof fg.graph2ScreenCoords === 'function') {
          const selected = new Set();
          nodes.forEach(node => {
            if (node.x !== undefined && node.y !== undefined) {
              const screenCoords = fg.graph2ScreenCoords(node.x, node.y);
              if (
                screenCoords &&
                screenCoords.x >= xMin && screenCoords.x <= xMax &&
                screenCoords.y >= yMin && screenCoords.y <= yMax
              ) {
                selected.add(String(node.id));
              }
            }
          });
          setSelectedLassoNodes(selected);
        }
      }
      
      setLassoStart(null);
      setLassoEnd(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isLassoing, lassoStart, lassoEnd, nodes]);

  // Sequential linking of lasso-selected nodes
  const handleLinkSelectedNodes = async () => {
    if (selectedLassoNodes.size < 2) return;
    const ids = Array.from(selectedLassoNodes);
    try {
      setLoading(true);
      for (let i = 0; i < ids.length - 1; i++) {
        const alreadyLinked = links.some(l => {
          if (!l) return false;
          const s = String(l.source?.id || l.source);
          const t = String(l.target?.id || l.target);
          return (s === ids[i] && t === ids[i+1]) || (s === ids[i+1] && t === ids[i]);
        });
        if (!alreadyLinked) {
          await addLink({ source: ids[i], target: ids[i+1] });
        }
      }
      setSelectedLassoNodes(new Set());
      await loadGraphData();
    } catch (err) {
      console.error("Failed to batch link nodes:", err);
    } finally {
      setLoading(false);
    }
  };

  // Batch reassign category
  const handleBatchCategory = async (newCat) => {
    if (!newCat || selectedLassoNodes.size === 0) return;
    try {
      setLoading(true);
      const ids = Array.from(selectedLassoNodes);
      
      const batchUpdates = [];
      for (const id of ids) {
        const nodeObj = nodes.find(n => String(n.id) === String(id));
        if (!nodeObj) continue;
        
        let recordId = nodeObj.nodeRecordId;
        if (!recordId && nodeObj.type !== 'custom') {
          try {
            const res = await addNode({
              title: nodeObj.title,
              type: nodeObj.type,
              notes: '',
              linkedEntityId: nodeObj.id,
              x: nodeObj.x,
              y: nodeObj.y,
              pinned: false,
              category: newCat
            });
            recordId = res.data.id;
            nodeObj.nodeRecordId = recordId;
          } catch (e) {
            console.error("Failed to create node record in batch categorizing:", e);
          }
        }
        
        if (recordId || nodeObj.type === 'custom') {
          batchUpdates.push({
            id: recordId || nodeObj.id,
            category: newCat
          });
        }
      }
      
      if (batchUpdates.length > 0) {
        await updateNodesBatch(batchUpdates);
      }
      
      setNodes(prevNodes => prevNodes.map(n => {
        if (selectedLassoNodes.has(String(n.id))) {
          return { ...n, category: newCat };
        }
        return n;
      }));
      
      setSelectedLassoNodes(new Set());
      await loadGraphData();
    } catch (err) {
      console.error("Failed to batch assign category:", err);
    } finally {
      setLoading(false);
    }
  };

  // Batch delete selected nodes
  const handleBatchDelete = async () => {
    if (selectedLassoNodes.size === 0) return;
    if (window.confirm(`Are you sure you want to delete all ${selectedLassoNodes.size} selected nodes and their connections?`)) {
      try {
        setLoading(true);
        const ids = Array.from(selectedLassoNodes);
        
        for (const id of ids) {
          const nodeObj = nodes.find(n => String(n.id) === String(id));
          if (!nodeObj) continue;
          
          const associatedLinks = links.filter(l => {
            if (!l) return false;
            const s = String(l.source?.id || l.source);
            const t = String(l.target?.id || l.target);
            return s === nodeObj.id || t === nodeObj.id;
          });

          for (const link of associatedLinks) {
            await deleteLink(link.id).catch(() => {});
          }

          if (nodeObj.type === 'custom') {
            await deleteNode(nodeObj.id).catch(() => {});
          } else if (nodeObj.nodeRecordId) {
            await deleteNode(nodeObj.nodeRecordId).catch(() => {});
          }
        }
        
        setSelectedLassoNodes(new Set());
        await loadGraphData();
      } catch (err) {
        console.error("Failed to batch delete selected nodes:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  // Filter nodes & links
  const filteredGraphData = useMemo(() => {
    const activeNodes = nodes.filter(n => {
      const matchesSearch = String(n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            String(n.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filters[n.type];
      
      const createdTime = n.created ? new Date(n.created).getTime() : 0;
      const matchesTimeline = !selectedDate || createdTime <= selectedDate;

      return matchesSearch && matchesFilter && matchesTimeline;
    });

    const activeNodeIds = new Set(activeNodes.map(n => String(n.id)));
    const activeLinks = links
      .filter(l => {
        if (!l) return false;
        const s = String(l.source?.id || l.source);
        const t = String(l.target?.id || l.target);
        return activeNodeIds.has(s) && activeNodeIds.has(t);
      })
      .map(l => {
        // Return a clean unmutated copy of the link to force D3 to re-bind to the active node objects
        return {
          ...l,
          source: String(l.source?.id || l.source),
          target: String(l.target?.id || l.target)
        };
      });

    return {
      nodes: activeNodes,
      links: activeLinks
    };
  }, [nodes, links, searchQuery, filters, selectedDate]);

  const handleNodeCreated = (newNode) => {
    setIsCreateModalOpen(false);
    setNewNodeCoords(null);
    loadGraphData();
  };

  return (
    <div 
      ref={containerRef} 
      className="-m-[2.5rem] w-[calc(100%+5rem)] h-[calc(100%+5rem)] relative bg-[var(--color-background)] overflow-hidden no-scrollbar premium-page-entrance"
    >
      {/* Loading overlay */}
      {loading && nodes.length === 0 && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-background)]/90 backdrop-blur-md">
          <RefreshCw className="w-7 h-7 text-violet-400 animate-spin mb-3" />
          <p className="text-xxs font-bold text-slate-500 uppercase tracking-widest">Constructing visual network...</p>
        </div>
      )}

      {/* Floating graph controller */}
      <GraphControls 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filters={filters}
        setFilters={setFilters}
        physics={physics}
        setPhysics={setPhysics}
        onResetCamera={resetCamera}
        onRefreshData={loadGraphData}
      />

      {/* Visual Linking Banner */}
      {connectMode && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 rounded-xl text-emerald-400 text-xs font-semibold flex items-center gap-3 shadow-2xl">
          <span>
            {linkSourceNode 
              ? `Starting Point: "${linkSourceNode.title}". Click a target node to connect.` 
              : 'Connect Mode Active: Select the starting node.'}
          </span>
          <button 
            onClick={() => { setConnectMode(false); setLinkSourceNode(null); }}
            className="p-1 hover:bg-emerald-500/20 rounded-md transition-all text-emerald-500 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Canvas Visualizer */}
      <div 
        onDoubleClick={handleBackgroundDoubleClick} 
        onMouseDown={handleMouseDown}
        className="w-full h-full cursor-grab active:cursor-grabbing relative"
      >
        <ForceGraph2D
          ref={graphRef}
          graphData={filteredGraphData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor={currentBgColor}
          nodeCanvasObject={paintNode}
          nodeRelSize={physics.nodeScale}
          nodeVal={node => {
            const isSel = selectedNode && selectedNode.id === node.id;
            const isHighlighted = highlightNodes.has(node.id) || (linkSourceNode && linkSourceNode.id === node.id);
            return isSel ? 2.4 : isHighlighted ? 1.6 : 1.0;
          }}
          onNodeClick={handleNodeClick}
          onLinkClick={handleLinkClick}
          linkPointerAreaPaint={(link, color, ctx) => {
            if (!link || !ctx) return;
            const s = link.source;
            const t = link.target;
            if (typeof s !== 'object' || typeof t !== 'object') return;
            ctx.strokeStyle = color;
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(t.x, t.y);
            ctx.stroke();
          }}
          onNodeDragStart={handleNodeDragStart}
          onNodeDrag={handleNodeDrag}
          onNodeDragEnd={handleNodeDragEnd}

          // Disable panning and zooming when drawing the lasso box
          enablePanInteraction={!isLassoing}
          enableZoomInteraction={!isLassoing}

          // Link options
          linkColor={l => {
            if (highlightLinks.has(l)) return COLORS.linkHighlight;
            const type = getLinkType(l);
            if (type === 'dependency') return 'rgba(244, 63, 94, 0.48)'; // Rose dependency link
            if (type === 'action') return 'rgba(167, 139, 250, 0.42)'; // Violet action link
            return COLORS.link;
          }}
          linkWidth={l => {
            if (highlightLinks.has(l)) return 2.8;
            const type = getLinkType(l);
            if (type === 'dependency') return 2.2;
            return 1.2;
          }}
          linkLineDash={l => null}
          linkDirectionalArrowLength={0}

          // Floating link particles
          linkDirectionalParticles={physics.showParticles ? (l => (highlightLinks.has(l) ? 4 : 1)) : 0}
          linkDirectionalParticleSpeed={l => (highlightLinks.has(l) ? 0.012 : 0.004)}
          linkDirectionalParticleWidth={1.8}
          linkDirectionalParticleColor={() => COLORS.particle}

          d3AlphaDecay={0.07}
          d3VelocityDecay={physics.velocityDecay}
          cooldownTicks={150}
        />

        {/* Floating lasso selection marquee box */}
        {isLassoing && lassoStart && lassoEnd && (
          <div 
            className="absolute border border-blue-500/50 bg-blue-500/10 pointer-events-none z-50 rounded-md shadow-[0_0_15px_rgba(59,130,246,0.15)]"
            style={{
              left: Math.min(lassoStart.x, lassoEnd.x),
              top: Math.min(lassoStart.y, lassoEnd.y),
              width: Math.abs(lassoStart.x - lassoEnd.x),
              height: Math.abs(lassoStart.y - lassoEnd.y)
            }}
          />
        )}
      </div>

      {/* Floating Lasso Action Bar */}
      <AnimatePresence>
        {selectedLassoNodes.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] bg-[#09090c]/95 border border-white/15 backdrop-blur-xl px-4 py-2.5 rounded-2xl flex items-center gap-4 shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center gap-2 border-r border-white/10 pr-4">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">
                {selectedLassoNodes.size} Nodes Selected
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLinkSelectedNodes}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 text-white text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                title="Link all selected nodes sequentially"
              >
                <Link2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Link Cluster</span>
              </button>
              
              <div className="w-32 shrink-0">
                <CategoryCombobox
                  value=""
                  onChange={handleBatchCategory}
                  suggestions={uniqueCategories}
                  placeholder="Assign Cat..."
                  accentColor="violet"
                  variant="minimal"
                />
              </div>

              <button
                type="button"
                onClick={handleBatchDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/35 text-rose-400 text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                title="Delete all selected nodes"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Batch</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedLassoNodes(new Set())}
                className="p-1.5 text-slate-500 hover:text-white rounded-md hover:bg-white/5 transition-all cursor-pointer"
                title="Clear Selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keys Cheat Sheet - Bottom Left */}
      <div className="hidden lg:flex absolute bottom-6 left-6 z-40 bg-[var(--color-card)]/90 backdrop-blur-xl border border-[var(--color-border)] px-3 py-1.5 rounded-xl items-center gap-3 text-slate-300 text-[9px] font-bold uppercase tracking-wider shadow-lg">
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/10 text-white font-mono text-[8px]">Double-Click Canvas</kbd>
          <span>Create</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-white/10" />
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/10 text-white font-mono text-[8px]">Drag</kbd>
          <span>Position</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-white/10" />
        <div className="flex items-center gap-1.5">
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/10 text-white font-mono text-[8px]">Shift + Drag</kbd>
          <span className="text-blue-400 font-bold">Select Multiple</span>
        </div>
      </div>

      {/* Timeline Evolution Playback Slider - Bottom Center */}
      {minDate && maxDate && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[var(--color-card)]/95 backdrop-blur-xl border border-[var(--color-border)] px-3.5 py-2 rounded-xl flex items-center gap-3 shadow-2xl w-[320px] md:w-[400px]">
          <button
            onClick={() => {
              setIsPlaying(prev => {
                const next = !prev;
                if (next && (selectedDate === null || selectedDate >= maxDate)) {
                  setSelectedDate(minDate);
                }
                return next;
              });
            }}
            className={`p-1.5 rounded-lg transition-all shadow-md font-bold flex items-center justify-center shrink-0 border border-white/5 cursor-pointer active:scale-95 ${
              isPlaying 
                ? 'bg-blue-600 text-white hover:bg-blue-500' 
                : 'bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08]'
            }`}
            title={isPlaying ? "Pause Playback" : "Play Evolution"}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <input
              type="range"
              min={minDate}
              max={maxDate}
              step={86400000} // daily steps
              value={selectedDate || maxDate}
              onChange={(e) => {
                setSelectedDate(parseInt(e.target.value));
                setIsPlaying(false); // stop playing when manual scrubbing occurs
              }}
              className="flex-1 h-1 sleek-slider cursor-pointer"
            />
            
            <span className="text-[9px] font-mono text-slate-400 select-none shrink-0 tracking-tighter">
              {(() => {
                if (!selectedDate) return 'ALL';
                try {
                  const d = new Date(selectedDate);
                  return isNaN(d.getTime()) 
                    ? 'ALL' 
                    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                } catch {
                  return 'ALL';
                }
              })()}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons - Bottom Right */}
      <div className="absolute bottom-6 right-6 z-40 flex items-center gap-1.5">
        <button
          onClick={() => {
            setConnectMode(!connectMode);
            setLinkSourceNode(null);
          }}
          className={`p-2.5 rounded-xl transition-all shadow-xl font-bold flex items-center gap-2 border cursor-pointer active:scale-95 ${
            connectMode 
              ? 'bg-emerald-500 text-white border-emerald-400' 
              : 'bg-white/[0.02] border-white/10 hover:border-white/20 text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
          title="Visually Connect Two Nodes"
        >
          <Link2 className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase tracking-wider">Connect</span>
        </button>

        <button
          onClick={() => {
            setNewNodeCoords(null);
            setIsCreateModalOpen(true);
          }}
          className="premium-btn p-2.5 rounded-xl hover:shadow-2xl shadow-violet-500/10 border border-violet-400/20 font-bold flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="text-[10px] uppercase tracking-wider">Add Node</span>
        </button>
      </div>

      {/* Slide-out Sidebar Note Editor Drawer */}
      <AnimatePresence>
        {selectedNode && (
          <NodeEditor 
            node={selectedNode}
            nodes={nodes}
            links={links}
            onClose={() => setSelectedNode(null)}
            onDeleteRequest={(node) => setNodeToDelete(node)}
            onDataChanged={(updatedFields) => {
              if (updatedFields && selectedNode) {
                // 1. Mutate the properties directly on the live D3 node object!
                // This ensures D3 NEVER resets, NEVER reheats, and the node NEVER drifts!
                const fg = graphRef.current;
                const d3Nodes = typeof fg?.graphData === 'function' ? fg.graphData()?.nodes || [] : [];
                const liveNode = d3Nodes.find(n => String(n.id) === String(selectedNode.id));
                if (liveNode) {
                  if (updatedFields.title !== undefined) liveNode.title = updatedFields.title;
                  if (updatedFields.notes !== undefined) liveNode.notes = updatedFields.notes;
                  if (updatedFields.category !== undefined) liveNode.category = updatedFields.category;
                  if (updatedFields.completed !== undefined) liveNode.completed = updatedFields.completed;
                }

                // 2. Mutate properties on the existing node objects in-place in the React state 'nodes' array!
                // Mutating in-place preserves array reference so react-force-graph doesn't trigger a reheat!
                nodes.forEach(n => {
                  if (String(n.id) === String(selectedNode.id)) {
                    if (updatedFields.title !== undefined) n.title = updatedFields.title;
                    if (updatedFields.notes !== undefined) n.notes = updatedFields.notes;
                    if (updatedFields.category !== undefined) n.category = updatedFields.category;
                    if (updatedFields.completed !== undefined) n.completed = updatedFields.completed;
                  }
                });

                // 3. Keep selectedNode in sync for the sidebar editor
                setSelectedNode(prev => prev ? { ...prev, ...updatedFields } : null);

                // 4. Force repaint canvas with the new properties, without reheating simulation!
                if (fg && typeof fg.refresh === 'function') {
                  fg.refresh();
                }
              } else {
                // If it's a structural change (like link added/severed or node deleted), reload from server
                loadGraphData();
              }
            }}
          />
        )}
        {selectedLink && (
          <LinkEditor 
            link={selectedLink}
            nodes={nodes}
            onClose={() => setSelectedLink(null)}
            onNodeSelect={(node) => {
              setSelectedNode(node);
              setSelectedLink(null);
            }}
            onDataChanged={loadGraphData}
          />
        )}
      </AnimatePresence>

      {/* Create Node Modal overlay */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <CreateNodeModal 
            initialCoordinates={newNodeCoords}
            onClose={() => {
              setIsCreateModalOpen(false);
              setNewNodeCoords(null);
            }}
            onSuccess={handleNodeCreated}
          />
        )}
      </AnimatePresence>

      {/* Custom Delete Confirmation Modal Overlay */}
      <AnimatePresence>
        {nodeToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-[#0a0a0d]/95 border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-6 relative text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-rose-400 animate-pulse" />
              </div>
              
              <h3 className="text-md font-bold text-white tracking-tight mb-2">
                Delete Graph Node?
              </h3>
              
              <p className="text-xs text-slate-400 leading-relaxed mb-6">
                Are you sure you want to delete <span className="text-white font-semibold">"{nodeToDelete.title}"</span> from the graph? The original item will remain untouched in your lists.
              </p>
              
              <div className="flex items-center gap-3 justify-center">
                <button
                  onClick={() => setNodeToDelete(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-slate-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.04] text-xxs font-bold uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeNodeDelete(nodeToDelete)}
                  className="px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-xl hover:shadow-rose-500/10 border border-rose-400/20 text-xxs font-bold uppercase tracking-wider transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GraphView;
