/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { enableNodeCompileCache } from './vs/base/node/nodeCompileCache.js';

enableNodeCompileCache('main');

// TEMP-DEBUG: capture main-process startup exceptions that Electron would
// otherwise show in a blocking native dialog.
import * as _fs from 'node:fs';
process.on('uncaughtException', (err) => {
	try {
		_fs.appendFileSync('/tmp/semafour-main-err.txt', 'UNCAUGHT: ' + String(err?.stack ?? err) + '\n---\n');
	} catch { /* ignore */ }
});
process.on('unhandledRejection', (reason) => {
	try {
		_fs.appendFileSync('/tmp/semafour-main-err.txt', 'REJECTION: ' + String(reason?.stack ?? reason) + '\n---\n');
	} catch { /* ignore */ }
});

await import('./mainImpl.js');
