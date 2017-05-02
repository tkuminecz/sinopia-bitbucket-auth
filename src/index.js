// @flow
import { type DictOf } from 'flow-helpers';
import fetch from 'node-fetch';
import Promise from 'bluebird';

const DEFAULT_TTL = 300;

type AuthConfig = {
	allow: string,
	ttl?: number,
}

type AuthStuff = {
 logger: *
}

/**
 * BitbucketAuth class
 */
class BitbucketAuth {

	allow: DictOf<string>

	ttl: number

	logger: *

	bitbucket: *

	constructor(config: AuthConfig, stuff: AuthStuff) {
		this.allow = parseAllow(config.allow);
		this.ttl = (config.ttl || DEFAULT_TTL) * 1000;
		this.bitbucket = null;
		this.logger = stuff.logger;

		this.logger.info({ allow: this.allow }, 'bitbucket allow config: @{allow}');
	}

	/**
	 * :: (string, string, Function) -> void
	 */
	authenticate(username: string, pass: string, onComplete: Function) {
		const email = decodeUsernameToEmail(username),
			creds = base64Encode(`${email}:${pass}`);

		Promise.resolve(fetch('https://api.bitbucket.org/1.0/user/privileges', {
			headers: {
				Authorization: `Basic ${creds}`,
			}
		}))
			.then(res => {
				if (res.status === 200) {
					return res.json();
				}
				else {
					throw new Error(`${res.status} ${res.statusText}`);
				}
			})
			.then(body => {
				const teams = body.teams;

				const allowedTeams = Object.keys(teams)
					.filter(team => {
						if (this.allow[team] == null) {
							return false;
						}

						if (this.allow[team].length === 0) {
							return true;
						}

						return ~this.allow[team].indexOf(teams[team]);
					});

				this.logger.info({ email, teams, allowedTeams }, '@{email} - @{teams} / @{allowedTeams}');

				onComplete(null, allowedTeams);
			})
			.catch(err => onComplete(err));
	}

	/**
	 * :: (string, string, Function) -> void
	 */
	add_user(user: string, pass: string, onComplete: Function) {
		this.authenticate(user, pass, onComplete);
	}

}

/**
 * Returns a base64 encoded version of the given string
 *
 * :: string -> string
 */
function base64Encode(str: string): string {
	return (new Buffer(str)).toString('base64');
}

/**
 * :: string -> DictOf string
 */
function parseAllow(allow: string): DictOf<string> {
	var result = {};

	allow.split(/\s*,\s*/).forEach((team: string) => {
		const teamChunks: Array<string> = ((team.trim().match(/^(.*?)(\((.*?)\))?$/): any): Array<string>);

		result[teamChunks[1]] = teamChunks[3] ? teamChunks[3].split('|') : [];
	});

	return result;
}

/**
 * Decodes a username to an email address.
 *
 * Since the local portion of email addresses
 * can't end with a dot or contain two consecutive
 * dots, we can replace the `@` with `..`. This
 * function converts from the above encoding to
 * a proper email address.
 *
 * :: string -> string
 */
function decodeUsernameToEmail(username: string): string {
	const pos = username.lastIndexOf('..');
	if (pos === -1) {
		return username;
	}

	return username.substr(0, pos) + '@' + username.substr(pos + 2);
}


// const auth = new BitbucketAuth({ allow: '' }, { logger: (...args) => console.log(...args) });

// auth.authenticate('tkuminecz@gmail.com', 'Rv49cmZYAD3$vL#', (x) => console.log(x));

module.exports = (config: *, stuff: *): BitbucketAuth => new BitbucketAuth(config, stuff);
