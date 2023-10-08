import * as vscode from 'vscode';
const https = require('https');

export function activate(context: vscode.ExtensionContext) {

	let addRequirementDisposable = vscode.commands.registerCommand('pip-requirements-helper.add-a-requirement', async () => {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			vscode.window.showErrorMessage('No active editor found');
			return;
		}
		https.request('https://pypi.org/', { method: 'HEAD' }, async (res: any) => {
			if (res.statusCode >= 400) {
				vscode.window.showErrorMessage("Seems like pypi is down.")
			} else {
				await handleInput();
			}
		}).on('error', (err: any) => {
			vscode.window.showErrorMessage("No internet connection")
		}).end();
		const handleInput = async () => {
			const userResponse = await vscode.window.showInputBox({ placeHolder: 'Type in the extension name' });
			https.get(`https://pypi.org/pypi/${userResponse?.trim()}/json`, (res: any) => {
				let data: any = [];
				const headerDate = res.headers && res.headers.date ? res.headers.date : 'no response date';
				if (res.statusCode !== 200) {
					vscode.window.showErrorMessage("requested package doesn't exist");
					return;
				}
				res.on('data', (chunk: any) => {
					data.push(chunk);
				});

				res.on('end', () => {
					const parsedData = JSON.parse(Buffer.concat(data).toString());
					const homepage = parsedData.info.home_page;
					const source = parsedData.info.project_urls?.Source;
					console.log(parsedData.info)
					let repoUrl = homepage;
					for (const key in parsedData.info.project_urls) {
						if (key.toLowerCase().includes('source')) {
							repoUrl = parsedData.info.project_urls[key];
							break;
						}
					}
					const version = parsedData.info.version;
					const nextMinorVersion = version.split('.')[0] + '.' + (parseInt(version.split('.')[1]) + 1).toString() + '.0';
					const name = parsedData.info.name;
					const constructedString = `${name}>=${version},<${nextMinorVersion}  # ${repoUrl}\n`;
					activeEditor.edit(editBuilder => {
						editBuilder.insert(activeEditor.selection.active, constructedString);
					});
				});
			}).on('error', (err: any) => {
				console.log('Error: ', err.message);
			});
		}
	});
	context.subscriptions.push(addRequirementDisposable);
}

export function deactivate() { }
