import { AutoLinkPlugin as LexicalAutoLinkPlugin } from '@lexical/react/LexicalAutoLinkPlugin';

const URL_MATCHER = /((https?:\/\/(www\.)?)|(www\.)|([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z0-9][a-z0-9-]*[a-z0-9])([-a-zA-Z0-9@:%_+.~#?&//=]*)/i;

const EMAIL_MATCHER = /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

const MATCHERS = [
    (text) => {
        const match = URL_MATCHER.exec(text);
        if (match === null) return null;
        const fullMatch = match[0];
        return {
            index: match.index,
            length: fullMatch.length,
            text: fullMatch,
            url: fullMatch.startsWith('http') ? fullMatch : `https://${fullMatch}`,
        };
    },
    (text) => {
        const match = EMAIL_MATCHER.exec(text);
        if (match === null) return null;
        const fullMatch = match[0];
        return {
            index: match.index,
            length: fullMatch.length,
            text: fullMatch,
            url: `mailto:${fullMatch}`,
        };
    },
];

export default function AutoLinkPlugin() {
    console.log('[AutoLinkPlugin] Mounting...');
    return <LexicalAutoLinkPlugin matchers={MATCHERS} />;
}
