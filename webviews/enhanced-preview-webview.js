/* global acquireVsCodeApi, document, window */

(function () {
    const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null;

    function readState() {
        const rawLineNumber = document.body.dataset.targetLineNumber || '';
        const parsedLineNumber = rawLineNumber === '' ? null : Number.parseInt(rawLineNumber, 10);

        return {
            targetLineNumber: Number.isNaN(parsedLineNumber) ? null : parsedLineNumber,
            targetHeaderText: document.body.dataset.targetHeaderText || null
        };
    }

    function clearTargetHeaderInfo() {
        if (!vscode) {
            return;
        }

        vscode.postMessage({
            command: 'clearTargetHeaderInfo'
        });
    }

    function highlightHeader(targetHeader) {
        targetHeader.classList.add('target-header-highlight');
        window.setTimeout(() => {
            targetHeader.classList.remove('target-header-highlight');
        }, 2000);
    }

    function findTargetHeader(headers, targetLineNumber, targetHeaderText) {
        if (targetHeaderText) {
            const trimmedTargetText = targetHeaderText.trim().toLowerCase();
            for (const header of headers) {
                if (header.textContent.trim().toLowerCase() === trimmedTargetText) {
                    return header;
                }
            }
        }

        if (targetLineNumber === null) {
            return null;
        }

        let bestMatch = null;
        let minDistance = Number.POSITIVE_INFINITY;

        for (let index = 0; index < headers.length; index += 1) {
            const estimatedLine = Math.floor((index + 1) * (targetLineNumber / headers.length));
            const distance = Math.abs(estimatedLine - targetLineNumber);

            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = headers[index];
            }
        }

        return bestMatch;
    }

    function scrollToTargetHeader() {
        const { targetLineNumber, targetHeaderText } = readState();
        if (targetLineNumber === null && !targetHeaderText) {
            return;
        }

        const headers = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        if (headers.length === 0) {
            clearTargetHeaderInfo();
            return;
        }

        const targetHeader = findTargetHeader(headers, targetLineNumber, targetHeaderText);
        if (!targetHeader) {
            clearTargetHeaderInfo();
            return;
        }

        targetHeader.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
        });
        highlightHeader(targetHeader);
        clearTargetHeaderInfo();
    }

    function scheduleHeaderNavigation() {
        window.setTimeout(scrollToTargetHeader, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleHeaderNavigation, { once: true });
    } else {
        scheduleHeaderNavigation();
    }
}());