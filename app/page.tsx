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
  const [nlpPolicyInput, setNlpPolicyInput] = useState("");
  const [nlpLoading, setNlpLoading] = useState(false);
  const [compiledConstraint, setCompiledConstraint] = useState<string | null>(null);

  const [recommendedCandidateId, setRecommendedCandidateId] = useState<"A" | "B" | "C">("C");

  // Run initial calculations
  const simResults: SimulationResult = useMemo(() => simulateCandidates(mockGcpResponse), []);
  const findings: RiskFinding[] = simResults.findings;
  const candidates: CandidateSimulation[] = useMemo(() => {
    const list = [...simResults.candidates];
    // Put the currently recommended candidate at the very top, and sort the rest by cost
    return list.sort((a, b) => {
      if (a.id === recommendedCandidateId) return -1;
      if (b.id === recommendedCandidateId) return 1;
      return a.metrics.cost - b.metrics.cost;
    });
  }, [simResults, recommendedCandidateId]);

  const currentCandidate = useMemo(() => {
    return candidates.find((c) => c.id === selectedCandidate) || candidates[0];
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
          // severed nested edge between platform and prod-admins
          { id: "e-plat-admins-cut", source: "platform", target: "prod-admins", className: "rf-edge-cut" },
          // New glowing safe direct bindings
          { id: "e-alice-viewrole", source: "alice", target: "roles/compute.viewer", className: "rf-edge-safe" },
          { id: "e-viewrole-prodfold", source: "roles/compute.viewer", target: "production-folder", className: "rf-edge-safe" },
          // Standard developers/platform links are inactive but intact
          { id: "e-devs-plat", source: "developers", target: "platform", className: "rf-edge-normal", opacity: 0.3 } as any,
          { id: "e-alice-plat", source: "alice", target: "platform", className: "rf-edge-normal", opacity: 0.3 } as any,
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

  const handleApplyCandidateSimulation = async (candId: "A" | "B" | "C") => {
    setDemoStep(3);
    setActiveTab("after");
    setSelectedTabCandidate(candId);
    setAiLoading(true);
    
    // Helper function for safe pre-rendered static reasoning
    const getFallbackReasoning = (cId: "A" | "B" | "C") => {
      if (cId === "C") {
        return "Removing Alice from the Developers group would revoke her access to 12 normal projects, causing immediate operational downtime. Conversely, breaking the entire nested group chain (Platform ➡️ Prod Admins) affects all 23 platform engineers who legitimately require production access. By severing the redundant nested linkage and directly binding the granular Compute Viewer role to Alice, we successfully preserve legitimate development scopes and restore essential reading rights with the absolute smallest blast radius (Cost Score: 138 vs 1110).";
      } else if (cId === "B") {
        return "Severing the connection between the Platform group and Prod Admins shuts down the high-risk authority path. However, this causes massive business friction: all 23 platform engineers recursively nested lose their Compute Admin access, resulting in a high impact score of 308. Operational complexity is 1, but user disruption is severe.";
      } else {
        return "Removing Alice from the Developers group is a highly blunt remediation. It cuts her access to 12 normal projects, violating the principle of least disruption. Furthermore, because her direct group binding to Platform remains intact, she STILL retains the risky Compute Admin role in the production folder (Remaining Risky Paths: 1, Cost Score: 1110). This leaves the core threat unresolved.";
      }
    };

    // Call Gemini API Route for explanations
    try {
      const targetMetrics = candidates.find(c => c.id === candId)?.metrics || {};
      const response = await fetch("/api/reason", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateId: candId,
          metrics: targetMetrics,
        }),
      });
      const data = await response.json();
      if (data.success && data.reasoning) {
        setGeminiExplanation(data.reasoning);
      } else {
        // Silent and graceful local fallback when API key is missing (or not configured)
        console.log("ℹ️ Local Mode: Rendering pre-rendered premium static reasoning fallback.");
        setGeminiExplanation(getFallbackReasoning(candId));
      }
    } catch (e) {
      // Graceful local fallback for network/offline errors
      console.log("ℹ️ Offline/Network Fallback: Rendering pre-rendered premium static reasoning.");
      setGeminiExplanation(getFallbackReasoning(candId));
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplySimulation = () => {
    handleApplyCandidateSimulation(selectedCandidate);
  };

  const handleApplyNlpPreset = (presetText: string) => {
    setNlpPolicyInput(presetText);
    // Auto-trigger compile for smooth demo experience
    setTimeout(() => {
      triggerPolicyCompile(presetText);
    }, 100);
  };

  const triggerPolicyCompile = async (policyText: string) => {
    setNlpLoading(true);
    setCompiledConstraint(null);

    // Simulate AI Policy Compilation Delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (policyText.includes("dev") || policyText.includes("deletion")) {
      setCompiledConstraint(
        `ASSERT (user == "alice") CANNOT delete_resource_under("folders/production-folder")\n` +
        `ASSERT (user == "alice") CAN_ACCESS ("folders/development-folder")`
      );
      // Candidate C perfectly satisfies this (preserves dev access, blocks admin production delete/write)
      setRecommendedCandidateId("C");
      handleApplyCandidateSimulation("C");
    } else {
      setCompiledConstraint(
        `ASSERT (group == "platform") ALLOW_READ_ONLY ("billing/*")\n` +
        `ASSERT (group == "platform") DENY ("roles/resourcemanager.folderAdmin")`
      );
      // Candidate B severs nested admin access for all platform engineers, keeping billing read-only intact
      setRecommendedCandidateId("B");
      handleApplyCandidateSimulation("B");
    }
    setNlpLoading(false);
  };

  const handleCompilePolicy = () => {
    triggerPolicyCompile(nlpPolicyInput);
  };

  const handleReset = () => {
    setDemoStep(0);
    setActiveTab("before");
    setSelectedTabCandidate("C");
    setRecommendedCandidateId("C");
    setGeminiExplanation(null);
    setNlpPolicyInput("");
    setCompiledConstraint(null);
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
            className={`btn ${demoStep === 0 ? "btn-glowing-pulse" : "btn-secondary"}`} 
            onClick={handleScanIAM}
            disabled={demoStep >= 1}
          >
            <Search size={16} /> {demoStep >= 1 ? "✓ 1. IAM Scanned" : "1. Scan IAM"}
          </button>
          
          <button 
            className={`btn ${demoStep === 1 ? "btn-glowing-pulse" : "btn-secondary"}`} 
            onClick={handleFindOptimalCut}
            disabled={demoStep < 1 || demoStep >= 2}
          >
            <Zap size={16} /> {demoStep >= 2 ? "✓ 2. Cut Identified" : "2. Find Optimal Cut"}
          </button>
          
          <button 
            className={`btn ${demoStep === 2 ? "btn-glowing-pulse" : "btn-secondary"}`} 
            onClick={handleApplySimulation}
            disabled={demoStep < 2 || demoStep >= 3}
          >
            <Sparkles size={16} /> {demoStep >= 3 ? "✓ 3. Simulated" : "3. Apply Simulation"}
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
              <>
                {/* 🛡️ SECURITY HEALTH CHECK SCORE WIDGET */}
                <div className="health-score-widget" style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "12px",
                  padding: "1rem",
                  marginBottom: "0.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.8rem",
                  boxShadow: "inset 0 0 20px rgba(0,0,0,0.2)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.05em" }}>
                      GCP IAM SECURITY HEALTH
                    </span>
                    <span style={{
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      padding: "0.15rem 0.4rem",
                      borderRadius: "4px",
                      background: demoStep < 3 ? "rgba(239, 68, 68, 0.12)" : selectedCandidate === "C" ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                      color: demoStep < 3 ? "var(--color-danger)" : selectedCandidate === "C" ? "var(--color-success)" : "var(--color-warning)",
                      border: "1px solid"
                    }}>
                      {demoStep < 3 ? "CRITICAL RISK" : selectedCandidate === "C" ? "FULLY SECURED" : "PARTIAL RISK"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    {/* Gauge Circle */}
                    <div style={{
                      position: "relative",
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      background: `conic-gradient(${
                        demoStep < 3 
                          ? "var(--color-danger)" 
                          : selectedCandidate === "C" 
                          ? "var(--color-success)" 
                          : "var(--color-warning)"
                      } ${
                        demoStep < 3 ? "122deg" : selectedCandidate === "C" ? "360deg" : selectedCandidate === "B" ? "288deg" : "162deg"
                      }, rgba(255,255,255,0.05) 0)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      {/* Inner mask */}
                      <div style={{
                        position: "absolute",
                        width: "48px",
                        height: "48px",
                        borderRadius: "50%",
                        background: "#0d111c",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "1.1rem",
                        fontFamily: "var(--font-mono)",
                        color: demoStep < 3 ? "var(--color-danger)" : selectedCandidate === "C" ? "var(--color-success)" : "var(--color-warning)"
                      }}>
                        {demoStep < 3 ? "34%" : selectedCandidate === "C" ? "100%" : selectedCandidate === "B" ? "80%" : "45%"}
                      </div>
                    </div>

                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {demoStep < 3 
                          ? "Critical Inheritance Threat" 
                          : selectedCandidate === "C" 
                          ? "Optimal Isolation Configured" 
                          : selectedCandidate === "B"
                          ? "Secure but High Disruption"
                          : "Partial Isolation (Redundant Paths)"}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: "1.3" }}>
                        {demoStep < 3 
                          ? "Alice inherits administrative privileges through 3 nested vulnerabilities." 
                          : selectedCandidate === "C" 
                          ? "Risk isolated completely, required viewer role mapped. 0 users disrupted." 
                          : selectedCandidate === "B"
                          ? "Alice isolated, but 23 team engineers lost critical access."
                          : "Alice lost dev access to 12 projects, but threat remains."}
                      </div>
                    </div>
                  </div>

                  {/* Tiny Quick Stats bar */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "0.4rem",
                    borderTop: "1px solid rgba(255,255,255,0.03)",
                    paddingTop: "0.6rem",
                    textAlign: "center",
                    fontSize: "0.7rem"
                  }}>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>Scope Users</div>
                      <strong style={{ color: "var(--text-primary)" }}>23</strong>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>Active Risks</div>
                      <strong style={{
                        color: demoStep < 3 ? "var(--color-danger)" : selectedCandidate === "C" ? "var(--color-success)" : "var(--color-warning)"
                      }}>
                        {demoStep < 3 ? "3" : selectedCandidate === "C" ? "0" : selectedCandidate === "B" ? "0" : "1"}
                      </strong>
                    </div>
                    <div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.65rem" }}>Disrupted Users</div>
                      <strong style={{
                        color: demoStep < 3 ? "var(--text-muted)" : selectedCandidate === "C" ? "var(--color-success)" : "var(--color-danger)"
                      }}>
                        {demoStep < 3 ? "0" : selectedCandidate === "C" ? "0" : selectedCandidate === "B" ? "23" : "1"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Individual Findings Cards */}
                {findings.map((f) => (
                  <div key={f.id} className={`finding-card ${f.severity}`}>
                    <div className="finding-header">
                      <span className="finding-id-badge" style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", background: "rgba(255,255,255,0.05)", padding: "0.1rem 0.3rem", borderRadius: "4px", color: "var(--text-secondary)" }}>
                        {f.id.split("-").slice(0, 2).join("-")}
                      </span>
                      <span className={`severity-badge ${f.severity}`}>{f.severity}</span>
                    </div>
                    <div className="finding-title" style={{ fontSize: "0.85rem", fontWeight: 700, marginTop: "0.2rem" }}>
                      {f.id.includes("01") ? "🔗 " : f.id.includes("02") ? "🛡️ " : "🔀 "} {f.title}
                    </div>
                    
                    {/* Highly visual summary block */}
                    <div className="finding-highlight-summary" style={{ margin: "0.4rem 0", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: "1.3" }}>
                      {f.id.includes("RISK-01") ? (
                        <div>
                          Target: <code style={{ color: "var(--color-danger)" }}>alice</code> inherits <code style={{ color: "var(--color-danger)" }}>Compute Admin</code> through nested chain:
                          <div style={{ marginTop: "0.25rem", background: "rgba(0,0,0,0.2)", padding: "0.3rem", borderRadius: "6px", fontSize: "0.7rem", fontFamily: "var(--font-mono)", color: "var(--color-danger)", display: "flex", gap: "0.2rem", alignItems: "center" }}>
                            alice ➡️ dev ➡️ plat ➡️ admins
                          </div>
                        </div>
                      ) : f.id.includes("RISK-02") ? (
                        <div>
                          Violation: Broad administrative scope on <code>production-folder</code> violates <strong>least privilege</strong> rules.
                        </div>
                      ) : (
                        <div>
                          Redundancy: <code style={{ color: "var(--color-warning)" }}>alice</code> has multiple paths to production, complicating audit.
                        </div>
                      )}
                    </div>

                    <div className="finding-evidence" style={{ fontSize: "0.7rem", opacity: 0.8, color: "var(--text-muted)" }}>
                      <strong>Evidence:</strong> {f.evidence}
                    </div>
                  </div>
                ))}
              </>
            )}
            {/* ========================================== */}
            {/* CUSTOM CONSTRAINTS: NLP COMPILER PANEL */}
            {/* ========================================== */}
            <div className="nlp-compiler-panel" style={{
              borderTop: "1px solid var(--border-glass)",
              padding: "1rem",
              marginTop: "auto",
              background: "rgba(139, 92, 246, 0.02)",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem"
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "var(--color-primary)", letterSpacing: "0.1em" }}>
                  CUSTOM CONSTRAINTS
                </span>
                <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.3rem", margin: 0 }}>
                  <Sparkles size={12} style={{ color: "var(--color-primary)" }} /> NLP Policy Compiler
                </h3>
                <p style={{ fontSize: "0.68rem", color: "var(--text-secondary)", margin: 0, lineHeight: "1.3" }}>
                  Enter natural language policies. Gemini compiles them into structured graph constraints.
                </p>
              </div>

              {/* STEP 1 SECTION */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--color-secondary)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <span style={{ background: "var(--color-secondary)", color: "#000", width: "14px", height: "14px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem", fontWeight: 900, textAlign: "center" }}>1</span>
                  SELECT A PRESET (또는 직접 입력)
                </div>
                
                <textarea
                  style={{
                    width: "100%",
                    height: "55px",
                    fontSize: "0.72rem",
                    padding: "0.4rem",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--border-glass)",
                    borderRadius: "6px",
                    color: "var(--text-primary)",
                    resize: "none",
                    fontFamily: "var(--font-sans)"
                  }}
                  placeholder="e.g., Keep development access, but block production admin privileges..."
                  value={nlpPolicyInput}
                  onChange={(e) => {
                    setNlpPolicyInput(e.target.value);
                    setCompiledConstraint(null);
                  }}
                />

                {/* Tactical Preset Cards */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginTop: "0.15rem" }}>
                  <button
                    className={`preset-tactile-btn ${nlpPolicyInput === "Keep dev environment, block production deletion" ? "active-preset" : ""}`}
                    onClick={() => handleApplyNlpPreset("Keep dev environment, block production deletion")}
                  >
                    <span style={{ fontSize: "0.6rem", fontWeight: 800, padding: "0.1rem 0.3rem", background: "rgba(255,255,255,0.05)", borderRadius: "4px", color: "var(--text-secondary)" }}>P1</span>
                    <span style={{ flex: 1 }}>• Keep dev environment, block production deletion</span>
                  </button>
                  <button
                    className={`preset-tactile-btn ${nlpPolicyInput === "Keep billing read-only, block folder admin" ? "active-preset" : ""}`}
                    onClick={() => handleApplyNlpPreset("Keep billing read-only, block folder admin")}
                  >
                    <span style={{ fontSize: "0.6rem", fontWeight: 800, padding: "0.1rem 0.3rem", background: "rgba(255,255,255,0.05)", borderRadius: "4px", color: "var(--text-secondary)" }}>P2</span>
                    <span style={{ flex: 1 }}>• Keep billing read-only, block folder admin</span>
                  </button>
                </div>
              </div>

              {/* STEP 2 SECTION */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginTop: "0.15rem" }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: nlpPolicyInput && !compiledConstraint ? "var(--color-primary)" : "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <span style={{ background: nlpPolicyInput && !compiledConstraint ? "var(--color-primary)" : "var(--text-muted)", color: "#000", width: "14px", height: "14px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.55rem", fontWeight: 900, textAlign: "center" }}>2</span>
                  COMPILE & DEPLOY
                </div>

                <button
                  className={`btn ${nlpPolicyInput && !compiledConstraint && !nlpLoading ? "btn-glowing-pulse" : "btn-primary"}`}
                  style={{
                    width: "100%",
                    padding: "0.45rem",
                    fontSize: "0.72rem",
                    background: nlpPolicyInput && !compiledConstraint ? "var(--color-primary)" : "rgba(255,255,255,0.02)",
                    border: nlpPolicyInput && !compiledConstraint ? "1px solid var(--color-primary)" : "1px solid rgba(255,255,255,0.05)",
                    color: nlpPolicyInput && !compiledConstraint ? "#fff" : "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.25rem",
                    cursor: nlpPolicyInput ? "pointer" : "not-allowed",
                    transition: "all 0.3s ease"
                  }}
                  onClick={() => handleCompilePolicy()}
                  disabled={!nlpPolicyInput || nlpLoading}
                >
                  {nlpLoading ? (
                    <>
                      <div className="spinner" style={{ width: "12px", height: "12px", borderWidth: "2px", borderTopColor: "#fff" }} /> Compiling Policy AST...
                    </>
                  ) : (
                    <>
                      <Sparkles size={11} /> Compile & Apply Policy
                    </>
                  )}
                </button>
              </div>

              {/* Compiled Output Block */}
              {compiledConstraint && (
                <div style={{
                  background: "rgba(16, 185, 129, 0.03)",
                  border: "1px solid rgba(16, 185, 129, 0.15)",
                  borderRadius: "6px",
                  padding: "0.5rem",
                  fontSize: "0.65rem",
                  fontFamily: "var(--font-mono)",
                  color: "var(--color-success)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.15rem",
                  marginTop: "0.15rem"
                }}>
                  <div style={{ fontWeight: 800, fontSize: "0.6rem", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                    <span>✓ COMPILED CONSTRAINT AST:</span>
                  </div>
                  <div style={{ color: "var(--text-primary)", fontSize: "0.65rem", whiteSpace: "pre-wrap" }}>{compiledConstraint}</div>
                  <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)", marginTop: "0.15rem", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "0.15rem" }}>
                    💡 <strong>Action:</strong> {selectedCandidate === "C" ? "Candidate C (Optimal)" : "Candidate B"} auto-selected to satisfy AST.
                  </div>
                </div>
              )}
            </div>
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
                  className={`candidate-card ${selectedCandidate === c.id ? "selected" : ""} ${recommendedCandidateId === c.id ? "recommended" : ""}`}
                  onClick={() => {
                    handleApplyCandidateSimulation(c.id);
                  }}
                >
                  {recommendedCandidateId === c.id && <span className="candidate-badge rec">🏆 Best Choice</span>}
                  {recommendedCandidateId !== c.id && selectedCandidate === c.id && <span className="candidate-badge" style={{ background: "rgba(139, 92, 246, 0.12)", color: "var(--color-primary)", border: "1px solid rgba(139, 92, 246, 0.3)" }}>✓ Simulating</span>}
                  {recommendedCandidateId === c.id && selectedCandidate === c.id && <span className="candidate-badge rec" style={{ right: "7.2rem", background: "rgba(16, 185, 129, 0.15)", color: "var(--color-success)", border: "1px solid rgba(16, 185, 129, 0.3)" }}>✓ Simulating</span>}
                  
                  <div className="candidate-id">{c.id}</div>
                  <div className="candidate-name">{c.name}</div>
                  
                  {/* Scannable Bullet Checklist Badges (Saves cognitive load!) */}
                  <div className="candidate-checklist" style={{ margin: "0.5rem 0", display: "flex", flexDirection: "column", gap: "0.25rem", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "0.5rem" }}>
                    {c.id === "A" && (
                      <>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-danger)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          ❌ Alice loses all 12 dev projects
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-danger)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          ⚠️ Unresolved admin risk path remains
                        </div>
                      </>
                    )}
                    {c.id === "B" && (
                      <>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-danger)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          ❌ platform team (23 users) loses admin
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-success)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          ✓ Alice's admin risk is severed
                        </div>
                      </>
                    )}
                    {c.id === "C" && (
                      <>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-success)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          ✓ Alice's normal dev work preserved
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-success)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          ✓ 100% administrative threat resolved
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-success)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          ✓ No legitimate users disrupted
                        </div>
                      </>
                    )}
                  </div>
                  
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
                  <div className="reasoning-text" style={{ padding: "0.2rem" }}>
                    {/* Visual Comparison Summary */}
                    <div className="reasoning-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                      <div className="reasoning-box pros" style={{ background: "rgba(16, 185, 129, 0.04)", border: "1px solid rgba(16, 185, 129, 0.12)", borderRadius: "8px", padding: "0.8rem" }}>
                        <h4 style={{ color: "var(--color-success)", fontSize: "0.8rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                          ✓ ADVANTAGES (장점)
                        </h4>
                        <ul style={{ fontSize: "0.78rem", color: "var(--text-secondary)", paddingLeft: "1.1rem", margin: 0, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          {selectedCandidate === "C" ? (
                            <>
                              <li><strong>Zero Downtime</strong>: Preserves access to 12 normal dev projects.</li>
                              <li><strong>Zero Team Interruption</strong>: No other platform engineers lose their admin rights.</li>
                              <li><strong>100% Resolved</strong>: Completely isolates Alice's administrative path.</li>
                            </>
                          ) : selectedCandidate === "B" ? (
                            <>
                              <li><strong>Threat Severed</strong>: Effectively closes the admin propagation vector.</li>
                              <li><strong>Low Complexity</strong>: Simple 1-step membership modification.</li>
                            </>
                          ) : (
                            <>
                              <li><strong>Fast Revocation</strong>: Quick 1-step group removal action.</li>
                            </>
                          )}
                        </ul>
                      </div>
                      
                      <div className="reasoning-box cons" style={{ background: "rgba(239, 68, 68, 0.04)", border: "1px solid rgba(239, 68, 68, 0.12)", borderRadius: "8px", padding: "0.8rem" }}>
                        <h4 style={{ color: "var(--color-danger)", fontSize: "0.8rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                          ❌ DRAWBACKS (단점)
                        </h4>
                        <ul style={{ fontSize: "0.78rem", color: "var(--text-secondary)", paddingLeft: "1.1rem", margin: 0, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          {selectedCandidate === "C" ? (
                            <>
                              <li><strong>Operational Steps</strong>: Requires 2 distinct steps (1 cut + 1 binding).</li>
                            </>
                          ) : selectedCandidate === "B" ? (
                            <>
                              <li><strong>Massive Disruption</strong>: 23 engineers recursively lose production access!</li>
                              <li><strong>Heavy Blast Radius</strong>: Drastically impacts legitimate operations.</li>
                            </>
                          ) : (
                            <>
                              <li><strong>Severe Outage</strong>: Alice immediately loses all 12 of her dev projects!</li>
                              <li><strong>Redundant Path</strong>: She STILL inherits Admin rights via other groups.</li>
                            </>
                          )}
                        </ul>
                      </div>
                    </div>

                    {/* Gemini Raw Output */}
                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.02)", borderRadius: "8px", padding: "0.8rem" }}>
                      <p style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700, marginBottom: "0.4rem", color: "#a78bfa", fontSize: "0.8rem" }}>
                        <TrendingDown size={16} /> AI Deep Surgeon Reasoning Justification:
                      </p>
                      <div style={{ fontSize: "0.82rem", color: "var(--text-primary)", lineHeight: "1.45" }}>
                        {geminiExplanation}
                      </div>
                    </div>
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
