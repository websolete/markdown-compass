# Enhanced Preview Panel Lifecycle Test

> Historical note: This guide documents the retired enhanced-preview runtime. It is kept as legacy validation context and does not describe the current shipped extension, which uses VS Code's native markdown preview as the only active rendered surface.

This document is specifically designed to test the Enhanced Preview panel lifecycle fix implemented in `enhanced-preview-provider.js`.

## Test Scenario 1: Basic Panel Opening

1. Click on a tree view item to open Enhanced Preview
2. Verify content renders correctly
3. Close the Enhanced Preview panel
4. Click on another tree view item
5. **CRITICAL TEST**: Verify that content renders in the newly opened panel

## Test Scenario 2: Multiple Open/Close Cycles

### Step 1: Header Navigation Test
- [Introduction](#introduction)
- [Features Overview](#features-overview)
- [Installation Guide](#installation-guide)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

### Step 2: Tree Navigation Test
Try clicking various items in the tree view multiple times after closing panels.

## Introduction

This is the introduction section. The Enhanced Preview should show this content when navigating here via tree view after a panel has been closed and reopened.

## Features Overview

### Key Features
- Tree view navigation
- Enhanced preview capabilities
- Markdown rendering
- Header navigation

The panel should render this content correctly even after multiple open/close cycles.

## Installation Guide

### Prerequisites
- VS Code 1.60+
- Node.js 14+

### Installation Steps
1. Install from marketplace
2. Configure settings
3. Test functionality

## Configuration

### Basic Settings
```json
{
  "markdownNavigator.enableEnhancedPreview": true,
  "markdownNavigator.autoOpenPreview": false
}
```

### Advanced Configuration
More configuration options here...

## Troubleshooting

### Common Issues

#### Issue 1: Panel Not Rendering Content
**Symptoms**: Enhanced Preview panel opens but shows no content after first panel was closed.

**Root Cause**: Panel disposal state not properly tracked in `openEnhancedPreview()` method.

**Fix Applied**: Enhanced panel validity checking with `this.panel && !this.isDisposed` and automatic panel recreation.

#### Issue 2: Multiple Panel Instances
**Prevention**: Proper panel lifecycle management and disposal tracking.

---

## Test Instructions

1. **Initial Test**: Open Enhanced Preview → Verify content renders → Close panel
2. **Critical Test**: Click another tree item → **VERIFY CONTENT RENDERS** (this was failing before the fix)
3. **Stress Test**: Repeat open/close cycle 5-10 times → Verify consistent behavior
4. **Navigation Test**: Use header navigation within Enhanced Preview after multiple cycles

## Expected Behavior After Fix

- ✅ Panel opens and renders content on first click
- ✅ Panel can be closed and reopened multiple times
- ✅ Content renders correctly after every panel recreation
- ✅ No "blank panel" issues after first closure
- ✅ Debug logging shows proper state tracking
- ✅ Error handling gracefully recovers from panel failures

## Debug Information

If issues persist, check the Output panel (View → Output → Markdown Navigator) for debug logs showing:
- Panel state tracking
- Disposal events
- Error handling activation
- Panel recreation events
