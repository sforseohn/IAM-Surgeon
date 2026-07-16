"use client";

import React, { useState, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  ShieldAlert,
  Search,
  CheckCircle,
  HelpCircle,
  TrendingDown,
  Terminal,
  Zap,
  RotateCcw,
  User,
  Users,
  Briefcase,
  Layers,
  Sparkles,
} from "lucide-react";
import { mockGcpResponse, IAMData } from "../lib/mock-data";
import { scanIAM, simulateCandidates, SimulationResult, RiskFinding, CandidateSimulation } from "../lib/iam-simulator";

// ========================================================
// REACT FLOW CUSTOM NODE COMPONENTS
// ========================================================

const CustomNode = ({ data }: { data: { label: string; type: "user" | "group" | "role" | "resource"; status?: "threat" | "safe" | "normal" | "cut" } }) => {
  const nodeClass = useMemo(() => {
    let base = "rf-custom-node";
    if (data.status === "threat") base += " rf-node-threat";
    else if (data.status === "safe") base += " rf-node-safe";
    else {
      if (data.type === "user") base += " rf-node-user";
      else if (data.type === "group") base += " rf-node-group";
      else if (data.type === "role") base += " rf-node-role";
      else if (data.type === "resource") base += " rf-node-resource";
    }
    return base;
  }, [data.type, data.status]);

  const nodeIcon = useMemo(() => {
    switch (data.type) {
      case "user": return <User size={14} />;
      case "group": return <Users size={14} />;
      case "role": return <Briefcase size={14} />;
      case "resource": return <Layers size={14} />;
    }
  }, [data.type]);

  return (
    <div className={nodeClass}>
      <Handle type="target" position={Position.Left} />
      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
        {nodeIcon}
        <span className="node-type">{data.type}</span>
      </div>
      <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{data.label}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

export default function Home() {
  // ========================================================
  // COMPONENT STATE
  // ========================================================
  const [demoStep, setDemoStep] = useState<0 | 1 | 2 | 3>(0); // 0: Init, 1: Scanned, 2: Optimal Cut found, 3: Simulated applied
  const [activeTab, setActiveTab] = useState<"before" | "after">("before");
  const [selectedCandidate, setSelectedTabCandidate] = useState<"A" | "B" | "C">("C");
  const [aiLoading, setAiLoading] = useState(false);
  const [geminiExplanation, setGeminiExplanation] = useState<string | null>(null);
  const [activeCliTab, setActiveCliTab] = useState<"reason" | "gcloud" | "terraform">("reason");

  // Run initial calculations
  const simResults: SimulationResult = useMemo(() => simulateCandidates(mockGcpResponse), []);
  const findings: RiskFinding[] = simResults.findings;
  const candidates: CandidateSimulation[] = simResults.candidates;

  const currentCandidate = useMemo(() => {
    return candidates.find((c) => c.id === selectedCandidate) || candidates[2];
  }, [candidates, selectedCandidate]);

  // ========================================================
  // REACT FLOW GRAPH CONFIGURATOR (BEFORE / AFTER STATE)
  // ========================================================
  const graphData = useMemo(() => {
    const nodes: Node[] = [
      // Users
      {
        id: "alice",
        type: "custom",
        data: { label: "alice", type: "user", status: demoStep >= 1 && activeTab === "before" ? "threat" : "normal" },
        position: { x: 40, y: 150 },
      },
      // Groups
      {
        id: "developers",
        type: "custom",
        data: { label: "developers", type: "group", status: "normal" },
        position: { x: 200, y: 60 },
      },
      {
        id: "platform",
        type: "custom",
        data: { label: "platform", type: "group", status: demoStep >= 1 && activeTab === "before" ? "threat" : "normal" },
        position: { x: 370, y: 150 },
      },
      {
        id: "prod-admins",
        type: "custom",
        data: { label: "prod-admins", type: "group", status: demoStep >= 1 && activeTab === "before" ? "threat" : "normal" },
        position: { x: 540, y: 240 },
      },
      // Roles
      {
        id: "roles/developer",
        type: "custom",
        data: { label: "Developer", type: "role", status: "normal" },
        position: { x: 710, y: 60 },
      },
      {
        id: "roles/compute.admin",
        type: "custom",
        data: { label: "Compute Admin", type: "role", status: demoStep >= 1 && activeTab === "before" ? "threat" : "normal" },
        position: { x: 710, y: 240 },
      },
      // Resources
      {
        id: "dev-projects",
        type: "custom",
        data: { label: "12 Dev Projects", type: "resource", status: "normal" },
        position: { x: 890, y: 60 },
      },
      {
        id: "production-folder",
        type: "custom",
        data: { label: "Production Folder", type: "resource", status: demoStep >= 1 && activeTab === "before" ? "threat" : "normal" },
        position: { x: 890, y: 240 },
      },
    ];

    let edges: Edge[] = [
      // Normal dev paths
      { id: "e-alice-devs", source: "alice", target: "developers", className: "rf-edge-normal" },
      { id: "e-devs-role", source: "developers", target: "roles/developer", className: "rf-edge-normal" },
      { id: "e-role-devproj", source: "roles/developer", target: "dev-projects", className: "rf-edge-normal" },
    ];

    if (activeTab === "before") {
      // Risk edges
      edges.push(
        { id: "e-alice-plat", source: "alice", target: "platform", className: demoStep >= 1 ? "rf-edge-threat" : "rf-edge-normal" },
        { id: "e-devs-plat", source: "developers", target: "platform", className: demoStep >= 1 ? "rf-edge-threat" : "rf-edge-normal" },
        { id: "e-plat-admins", source: "platform", target: "prod-admins", className: demoStep >= 1 ? "rf-edge-threat" : "rf-edge-normal" },
        { id: "e-admins-adminrole", source: "prod-admins", target: "roles/compute.admin", className: demoStep >= 1 ? "rf-edge-threat" : "rf-edge-normal" },
        { id: "e-adminrole-prodfold", source: "roles/compute.admin", target: "production-folder", className: demoStep >= 1 ? "rf-edge-threat" : "rf-edge-normal" }
      );
    } else {
      // AFTER SIMULATION GRAPH (C)
      if (selectedCandidate === "A") {
        // Alice removed from developers, but her direct "alice -> platform" is untouched!
        nodes[0].data.status = "threat"; // Alice is still a threat
        edges = [
          { id: "e-alice-plat", source: "alice", target: "platform", className: "rf-edge-threat" },
          { id: "e-devs-plat", source: "developers", target: "platform", className: "rf-edge-normal" },
          { id: "e-plat-admins", source: "platform", target: "prod-admins", className: "rf-edge-threat" },
          { id: "e-admins-adminrole", source: "prod-admins", target: "roles/compute.admin", className: "rf-edge-threat" },
          { id: "e-adminrole-prodfold", source: "roles/compute.admin", target: "production-folder", className: "rf-edge-threat" },
          // Dev connections stay but Alice loses them
          { id: "e-devs-role", source: "developers", target: "roles/developer", className: "rf-edge-normal" },
          { id: "e-role-devproj", source: "roles/developer", target: "dev-projects", className: "rf-edge-normal" },
        ];
        // severed edge
        edges.push({ id: "e-alice-devs-cut", source: "alice", target: "developers", className: "rf-edge-cut" });
      } else if (selectedCandidate === "B") {
        // Disconnect platform -> prod-admins
        edges.push(
          { id: "e-alice-plat", source: "alice", target: "platform", className: "rf-edge-normal" },
          { id: "e-devs-plat", source: "developers", target: "platform", className: "rf-edge-normal" },
          { id: "e-plat-admins-cut", source: "platform", target: "prod-admins", className: "rf-edge-cut" },
          { id: "e-admins-adminrole", source: "prod-admins", target: "roles/compute.admin", className: "rf-edge-normal", opacity: 0.4 } as any,
          { id: "e-adminrole-prodfold", source: "roles/compute.admin", target: "production-folder", className: "rf-edge-normal", opacity: 0.4 } as any
        );
      } else if (selectedCandidate === "C") {
        // Sever developers -> platform + Direct Bind Viewer
        // Create new direct safe node (Compute Viewer)
        nodes.push({
          id: "roles/compute.viewer",
          type: "custom",
          data: { label: "Compute Viewer", type: "role", status: "safe" },
          position: { x: 710, y: 150 },
        });

        // Highlight Alice and Production Folder as safe
        nodes[0].data.status = "normal";
        nodes[nodes.length - 2].data.status = "normal"; // Production Folder is safe now

        edges.push(
          // severed nested edge
          { id: "e-devs-plat-cut", source: "developers", target: "platform", className: "rf-edge-cut" },
          // alice -> platform is also severed to completely isolate Alice
          { id: "e-alice-plat-cut", source: "alice", target: "platform", className: "rf-edge-cut" },
          // New glowing safe direct bindings
          { id: "e-alice-viewrole", source: "alice", target: "roles/compute.viewer", className: "rf-edge-safe" },
          { id: "e-viewrole-prodfold", source: "roles/compute.viewer", target: "production-folder", className: "rf-edge-safe" },
          // Standard admin nodes are inactive but intact for platform engineers
          { id: "e-plat-admins", source: "platform", target: "prod-admins", className: "rf-edge-normal", opacity: 0.3 } as any,
          { id: "e-admins-adminrole", source: "prod-admins", target: "roles/compute.admin", className: "rf-edge-normal", opacity: 0.3 } as any,
          { id: "e-adminrole-prodfold", source: "roles/compute.admin", target: "production-folder", className: "rf-edge-normal", opacity: 0.3 } as any
        );
      }
    }

    return { nodes, edges };
  }, [demoStep, activeTab, selectedCandidate]);

  // ========================================================
  // ACTIONS / HANDLERS
  // ========================================================
  const handleScanIAM = () => {
    setDemoStep(1);
    setActiveTab("before");
  };

  const handleFindOptimalCut = () => {
    setDemoStep(2);
    setSelectedTabCandidate("C");
  };

  const handleApplySimulation = async () => {
    setDemoStep(3);
    setActiveTab("after");
    setAiLoading(true);
    
    // Helper function for safe pre-rendered static reasoning
    const getFallbackReasoning = (candId: "A" | "B" | "C") => {
      if (candId === "C") {
        return "Removing Alice from the Developers group would revoke her access to 12 normal projects, causing immediate operational downtime. Conversely, breaking the entire nested group chain (Platform ➡️ Prod Admins) affects all 23 platform engineers who legitimately require production access. By severing the redundant nested linkage and directly binding the granular Compute Viewer role to Alice, we successfully preserve legitimate development scopes and restore essential reading rights with the absolute smallest blast radius (Cost Score: 138 vs 1110).";
      } else if (candId === "B") {
        return "Severing the connection between the Platform group and Prod Admins shuts down the high-risk authority path. However, this causes massive business friction: all 23 platform engineers recursively nested lose their Compute Admin access, resulting in a high impact score of 308. Operational complexity is 1, but user disruption is severe.";
      } else {
        return "Removing Alice from the Developers group is a highly blunt remediation. It cuts her access to 12 normal projects, violating the principle of least disruption. Furthermore, because her direct group binding to Platform remains intact, she STILL retains the risky Compute Admin role in the production folder (Remaining Risky Paths: 1, Cost Score: 1110). This leaves the core threat unresolved.";
      }
    };

    // Call Gemini API Route for explanations
    try {
      const response = await fetch("/api/reason", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: selectedCandidate,
          metrics: currentCandidate.metrics,
        }),
      });
      const data = await response.json();
      if (data.success && data.reasoning) {
        setGeminiExplanation(data.reasoning);
      } else {
        // Silent and graceful local fallback when API key is missing (or not configured)
        console.log("ℹ️ Local Mode: Rendering pre-rendered premium static reasoning fallback (Provide GEMINI_API_KEY env var to invoke live AI reasoning).");
        setGeminiExplanation(getFallbackReasoning(selectedCandidate));
      }
    } catch (e) {
      // Graceful local fallback for network/offline errors
      console.log("ℹ️ Offline/Network Fallback: Rendering pre-rendered premium static reasoning.");
      setGeminiExplanation(getFallbackReasoning(selectedCandidate));
    } finally {
      setAiLoading(false);
    }
  };

  const handleReset = () => {
    setDemoStep(0);
    setActiveTab("before");
    setSelectedTabCandidate("C");
    setGeminiExplanation(null);
  };

  // ========================================================
  // DYNAMIC CODE GENERATORS (GCLOUD / TERRAFORM)
  // ========================================================
  const generatedGcloudCode = useMemo(() => {
    if (selectedCandidate === "C") {
      return `# 1. Remove developers nesting link from platform\n` +
             `gcloud identity groups memberships delete \\\n` +
             `  --group-email=platform@yourcompany.com \\\n` +
             `  --member-email=developers@yourcompany.com\n\n` +
             `# 2. Bind Compute Viewer directly to Alice on the Production resource\n` +
             `gcloud resource-manager folders add-iam-policy-binding production-folder \\\n` +
             `  --member="user:alice@yourcompany.com" \\\n` +
             `  --role="roles/compute.viewer"`;
    } else if (selectedCandidate === "B") {
      return `# Remove platform group nesting from prod-admins\n` +
             `gcloud identity groups memberships delete \\\n` +
             `  --group-email=prod-admins@yourcompany.com \\\n` +
             `  --member-email=platform@yourcompany.com`;
    } else {
      return `# Remove Alice from developers group\n` +
             `gcloud identity groups memberships delete \\\n` +
             `  --group-email=developers@yourcompany.com \\\n` +
             `  --member-email=alice@yourcompany.com`;
    }
  }, [selectedCandidate]);

  const generatedTerraformCode = useMemo(() => {
    if (selectedCandidate === "C") {
      return `# Remove nesting block from google_identity_group_membership.platform\n` +
             `# And add direct granular binding for Alice:\n` +
             `resource "google_folder_iam_member" "alice_viewer" {\n` +
             `  folder = "folders/production-folder"\n` +
             `  role   = "roles/compute.viewer"\n` +
             `  member = "user:alice@yourcompany.com"\n` +
             `}`;
    } else if (selectedCandidate === "B") {
      return `# Remove platform group from prod-admins membership mapping\n` +
             `# This breaks the organizational inheritance model:\n` +
             `# (No resource bindings to change)`;
    } else {
      return `# Remove alice from developers group resource:\n` +
             `# google_identity_group_membership.developers`;
    }
  }, [selectedCandidate]);

  return (
    <div className="app-container">
      {/* ========================================== */}
      {/* 1. APP HEADER */}
      {/* ========================================== */}
      <header className="app-header">
        <div className="brand">
          <ShieldAlert size={24} style={{ color: "var(--color-primary)" }} />
          <div>
            <h1>Optimal Cutting Edge</h1>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              IAM Surgeon & Nesting Group Sim Analyzer
            </div>
          </div>
          <span className="brand-badge">Gemini Reasoning</span>
        </div>

        <div className="action-buttons">
          {demoStep > 0 && (
            <button className="btn btn-secondary" onClick={handleReset}>
              <RotateCcw size={16} /> Reset
            </button>
          )}
          
          <button 
            className="btn btn-secondary" 
            onClick={handleScanIAM}
            disabled={demoStep >= 1}
          >
            <Search size={16} /> 1. Scan IAM
          </button>
          
          <button 
            className="btn btn-primary" 
            onClick={handleFindOptimalCut}
            disabled={demoStep < 1 || demoStep >= 2}
          >
            <Zap size={16} /> 2. Find Optimal Cut
          </button>
          
          <button 
            className="btn btn-success" 
            onClick={handleApplySimulation}
            disabled={demoStep < 2}
          >
            <Sparkles size={16} /> 3. Apply Simulation
          </button>
        </div>
      </header>

      {/* ========================================== */}
      {/* 2. MAIN 3-COLUMN WORKSPACE GRID */}
      {/* ========================================== */}
      <div className="main-grid">
        
        {/* LEFT COLUMN: RISK FINDINGS */}
        <aside className="sidebar-panel">
          <div className="panel-header">
            <h2><ShieldAlert size={18} style={{ color: demoStep >= 1 ? "var(--color-danger)" : "var(--text-muted)" }} /> Risk Findings</h2>
            {demoStep >= 1 && <span className="severity-badge CRITICAL">{findings.length} Found</span>}
          </div>
          <div className="panel-content">
            {demoStep === 0 ? (
              <div className="empty-state">
                <HelpCircle className="empty-state-icon" />
                <p>Click <strong>Scan IAM</strong> to run vulnerability discovery on GCP response.</p>
              </div>
            ) : (
              findings.map((f) => (
                <div key={f.id} className={`finding-card ${f.severity}`}>
                  <div className="finding-header">
                    <span className={`severity-badge ${f.severity}`}>{f.severity}</span>
                  </div>
                  <div className="finding-title">{f.title}</div>
                  <div className="finding-desc">{f.description}</div>
                  <div className="finding-evidence">{f.evidence}</div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* CENTER COLUMN: AUTHORITY GRAPH */}
        <main className="graph-panel">
          <div className="graph-toolbar">
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}>
              Graph State:
            </span>
            <div className="state-toggle">
              <div 
                className={`toggle-option ${activeTab === "before" ? "active" : ""}`}
                onClick={() => {
                  if (demoStep >= 1) setActiveTab("before");
                }}
              >
                Before
              </div>
              <div 
                className={`toggle-option ${activeTab === "after" ? "active" : ""}`}
                onClick={() => {
                  if (demoStep >= 3) setActiveTab("after");
                }}
              >
                After
              </div>
            </div>
          </div>

          <div className="graph-container">
            <ReactFlow
              nodes={graphData.nodes}
              edges={graphData.edges}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-left"
            >
              <Background color="#1f2937" gap={16} size={1} />
              <Controls />
            </ReactFlow>
          </div>
        </main>

        {/* RIGHT COLUMN: REMEDIATION CANDIDATES */}
        <aside className="sidebar-panel">
          <div className="panel-header">
            <h2><CheckCircle size={18} style={{ color: "var(--color-success)" }} /> Remediation Options</h2>
          </div>
          <div className="panel-content">
            {demoStep < 2 ? (
              <div className="empty-state">
                <HelpCircle className="empty-state-icon" />
                <p>Click <strong>Find Optimal Cut</strong> to compute edge cuts and impact metrics.</p>
              </div>
            ) : (
              candidates.map((c) => (
                <div 
                  key={c.id} 
                  className={`candidate-card ${selectedCandidate === c.id ? "selected" : ""} ${c.recommended ? "recommended" : ""}`}
                  onClick={() => {
                    setSelectedTabCandidate(c.id);
                    if (demoStep >= 3) {
                      // Re-trigger explanation loading when user clicks another candidate in simulated view
                      setTimeout(() => handleApplySimulation(), 10);
                    }
                  }}
                >
                  {c.recommended && <span className="candidate-badge rec">Optimal</span>}
                  {!c.recommended && selectedCandidate === c.id && <span className="candidate-badge" style={{ background: "var(--color-primary)", color: "#fff" }}>Active</span>}
                  
                  <div className="candidate-id">{c.id}</div>
                  <div className="candidate-name">{c.name}</div>
                  <div className="candidate-desc">{c.description}</div>
                  
                  <div className="metrics-grid">
                    <div className="metric-item">
                      <span>Disrupted Users:</span>
                      <span className={`metric-val ${c.metrics.affectedUsers > 10 ? "danger" : ""}`}>
                        {c.metrics.affectedUsers}
                      </span>
                    </div>
                    <div className="metric-item">
                      <span>Lost Normal Dev Access:</span>
                      <span className={`metric-val ${c.metrics.lostLegitimatePermissions > 0 ? "danger" : "success"}`}>
                        {c.metrics.lostLegitimatePermissions}
                      </span>
                    </div>
                    <div className="metric-item">
                      <span>Remaining Risk:</span>
                      <span className={`metric-val ${c.metrics.remainingRiskyPaths > 0 ? "danger" : "success"}`}>
                        {c.metrics.remainingRiskyPaths}
                      </span>
                    </div>
                    <div className="metric-item">
                      <span>Complexity Score:</span>
                      <span className="metric-val">{c.metrics.operationalComplexity}</span>
                    </div>
                  </div>

                  <div className="cost-score-container">
                    <span className="cost-label">Blast Radius Cost:</span>
                    <span className="cost-value" style={{ color: c.recommended ? "var(--color-success)" : "var(--color-secondary)" }}>
                      {c.metrics.cost}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

      </div>

      {/* ========================================== */}
      {/* 3. BOTTOM PANEL: AI REASONING & CLI */}
      {/* ========================================== */}
      {demoStep >= 3 && (
        <section className="bottom-panel">
          <div className="terminal-header">
            <div className="terminal-title">
              <Terminal size={18} />
              <span>Gemini Deep Reasoning Engine</span>
            </div>
            <div className="terminal-tabs">
              <button 
                className={`terminal-tab ${activeCliTab === "reason" ? "active" : ""}`}
                onClick={() => setActiveCliTab("reason")}
              >
                AI Reasoning Justification
              </button>
              <button 
                className={`terminal-tab ${activeCliTab === "gcloud" ? "active" : ""}`}
                onClick={() => setActiveCliTab("gcloud")}
              >
                gcloud Commands
              </button>
              <button 
                className={`terminal-tab ${activeCliTab === "terraform" ? "active" : ""}`}
                onClick={() => setActiveCliTab("terraform")}
              >
                Terraform Configuration
              </button>
            </div>
          </div>

          <div className="terminal-content">
            {aiLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem" }}>
                <div className="spinner"></div>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                  Analyzing nested IAM lineages and computing operational blast radius...
                </span>
              </div>
            ) : (
              <>
                {activeCliTab === "reason" && (
                  <div className="reasoning-text">
                    <p style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700, marginBottom: "0.4rem", color: "#a78bfa" }}>
                      <TrendingDown size={16} /> Why Candidate {selectedCandidate} is {selectedCandidate === "C" ? "Recommended" : "Not Ideal"}:
                    </p>
                    {geminiExplanation}
                  </div>
                )}
                {activeCliTab === "gcloud" && (
                  <pre className="code-terminal"><code>{generatedGcloudCode}</code></pre>
                )}
                {activeCliTab === "terraform" && (
                  <pre className="code-terminal"><code>{generatedTerraformCode}</code></pre>
                )}
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
