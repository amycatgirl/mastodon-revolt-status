declare namespace NodeJS {
	export interface ProcessEnv {
	  ACCESS_TOKEN?: string;
	  MASTODON_URL?: string;
	  DISABLE_MASTO?: boolean;
	  FAIL_EVERYTHING?: boolean;
	}
}
