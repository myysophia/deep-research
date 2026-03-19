"use client";

import dynamic from "next/dynamic";

const RevisionWorkspace = dynamic(() => import("./Workspace"));

export default RevisionWorkspace;
