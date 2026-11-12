import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkbenchContributionsRegistry, Extensions as WorkbenchExtensions, IWorkbenchContribution } from '../../../common/contributions.js';
import { LifecyclePhase } from '../../../services/lifecycle/common/lifecycle.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';

export class KiloDefaultSidebarContribution implements IWorkbenchContribution {
	private static readonly STORAGE_KEY = 'semafour.kiloSidebarOpenedOnStartup';

	constructor(
		@IViewsService private readonly viewsService: IViewsService,
		@IStorageService private readonly storageService: IStorageService
	) {
		if (!this.storageService.getBoolean(KiloDefaultSidebarContribution.STORAGE_KEY, StorageScope.WORKSPACE, false)) {
			this.storageService.store(KiloDefaultSidebarContribution.STORAGE_KEY, true, StorageScope.WORKSPACE, StorageTarget.MACHINE);
			// The ID is generated based on the view container ID from package.json:
			// "workbench.view.extension.kilo-code-ActivityBar"
			setTimeout(() => {
				this.viewsService.openViewContainer('workbench.view.extension.kilo-code-ActivityBar', true);
			}, 1000);
		}
	}
}

Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(KiloDefaultSidebarContribution, LifecyclePhase.Restored);
