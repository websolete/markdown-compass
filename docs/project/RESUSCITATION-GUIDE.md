# Markdown Navigator Resuscitation Project

## Project Overview
This document serves as a living guide for the resuscitation of the Markdown Navigator VS Code extension. It will track progress, document decisions, and maintain context across working sessions.

## Session Context
- **Current Date**: September 6, 2025
- **Current AI Assistant**: Claude Sonnet 4 (switched from GitHub Copilot)
- **Session Continuity**: Using this document as a bridge between sessions

## Project Setup

### Reference Directory
- Created `.references/` directory in the project root
- Added `.references/` to `.gitignore`
- Created symbolic link from `.references/copirate` to `D:\Inetpub\vscode_extensions\copirate`
  - This provides access to patterns, code, and assets from the Copirate extension
  - Since the parent folder is gitignored, the details of the Copirate repo won't appear in git
- Created symbolic link from `.references/markdown-cfml-syntax` to `D:\Inetpub\vscode_extensions\markdown-cfml-syntax`
  - This was a successful spinoff project that accomplished CFML syntax highlighting for markdown previews
  - The functionality should be integrated back into markdown navigator to improve the experience for ColdFusion developers

### Current Progress
1. ✅ Created `.references/` directory
2. ✅ Updated `.gitignore` to include `.references/`
3. ✅ Created symbolic link to Copirate extension
4. ✅ Created symbolic link to markdown-cfml-syntax extension

### Next Steps
1. Explore the current state of the Markdown Navigator extension
2. Review existing documentation
3. Analyze the code structure and architecture
4. Compare with the patterns and approaches used in the Copirate extension
5. Review the markdown-cfml-syntax implementation for CFML syntax highlighting integration
6. Identify areas for improvement and modernization
7. Develop a plan for implementing improvements (including CFML syntax highlighting)
8. Execute the plan incrementally with testing at each stage

## Development Approach
- Leverage successful patterns from the Copirate extension where applicable
- Maintain backward compatibility when making improvements
- Document all significant changes and decisions in this guide
- Utilize automated tests to ensure stability
- **Field test @copirate chat participant** during development as a real-world usage validation
- Document @copirate successes, failures, and functionality gaps encountered during the process

## Important Files and Directories
- Active runtime source in `/src` with `src/extension.ts` as the TypeScript entry during Phase 5 cutover
- Shipping build target at `dist/extension.js`
- Legacy root JavaScript runtime files (`extension.js`, `favorites-provider.js`, `enhanced-preview-provider.js`) retained only as temporary migration-era references until Phase 5 completes
- Documentation in `/docs`
- Styles in `/styles`
- Tests in `/test`, `/testing`, and `/tests`

## Notes
- The session has continued with Claude Sonnet 4 as requested
- The original project had difficulties with CFML syntax highlighting due to over-engineering
- The markdown-cfml-syntax project was a successful spinoff that should be integrated back
- Focus on improving the experience for ColdFusion developers using markdown for code documentation
- **@copirate Testing Protocol**: Will use @copirate chat participant throughout development to validate its functionality in real-world VS Code extension development scenarios

## @Copirate Field Testing Log
*This section will document experiences with @copirate during development*

### Setup
- [ ] Add @copirate participant to this workspace
- [ ] Begin using @copirate for development assistance
- [ ] Document successes, failures, and gaps as they occur
