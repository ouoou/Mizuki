export {};

type SearchResult = {
	url: string;
	meta: {
		title: string;
	};
	excerpt: string;
	content?: string;
	word_count?: number;
	filters?: Record<string, unknown>;
	anchors?: Array<{
		element: string;
		id: string;
		text: string;
		location: number;
	}>;
	weighted_locations?: Array<{
		weight: number;
		balanced_score: number;
		location: number;
	}>;
	locations?: number[];
	raw_content?: string;
	raw_url?: string;
	sub_results?: SearchResult[];
};

type PagefindApi = {
	search: (query: string) => Promise<{
		results: Array<{
			data: () => Promise<SearchResult>;
		}>;
	}>;
	options?: (options: { excerptLength: number }) => Promise<void>;
};

type TranslateApi = {
	changeLanguage?: (language: string) => void;
	service: {
		use: (service: string) => void;
	};
	language: {
		setLocal: (language: string) => void;
		getCurrent?: () => string;
		getLocal?: () => string;
		translateLocal?: boolean;
	};
	setAutoDiscriminateLocalLanguage: () => void;
	ignore: {
		class: string[];
		tag: string[];
	};
	selectLanguageTag: {
		show: boolean;
		refreshRender?: () => void;
	};
	storage: {
		set: (...args: any[]) => void;
	};
	listener: {
		start: () => void;
	};
	execute: () => void;
	reset?: () => void;
	to?: string;
};

type IconifyLoaderApi = {
	isLoaded: boolean;
	load: (options?: { timeout?: number; retryCount?: number }) => Promise<void>;
	addToPreloadQueue: (icons: string[] | string) => void;
	onLoad: (callback: () => void) => void;
};

type SwupApi = {
	hooks: {
		on: (
			event: string,
			handler: (...args: any[]) => void,
			options?: { before?: boolean },
		) => void;
	};
};

type GalleryManagerApi = {
	isInitialized: boolean;
	clickHandler: ((event: MouseEvent) => void) | null;
	init: () => void;
	cleanup: () => void;
};

declare global {
	interface HTMLElementTagNameMap {
		"table-of-contents": HTMLElement & {
			init?: () => void;
		};
	}

	interface Window {
		swup: SwupApi;
		pagefind: PagefindApi;
		translate?: TranslateApi;
		loadTranslateScript: () => Promise<void>;
		mobileTOCInit?: () => void;
		initSemifullScrollDetection?: () => void;
		semifullScrollHandler?: ((event: Event) => void) | null;
		closeAnnouncement?: () => void;
		iconifyLoaded?: boolean;
		__iconifyLoader?: IconifyLoaderApi;
		__iconifyLoaderInitialized?: boolean;
		loadIconify?: () => Promise<void>;
		preloadIcons?: (icons: string[] | string) => void;
		onIconifyReady?: (callback: () => void) => void;
		galleryManager?: GalleryManagerApi;
	}
}
