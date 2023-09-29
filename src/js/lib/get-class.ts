import { isThisNode } from '../keepTrackApi';


export const getClass = (id: string): HTMLElement[] => {
    const els = <HTMLElement[]>Array.from(document.getElementsByClassName(id));
    if (els.length) return els;
    if (isThisNode()) {
        // Create an empty DIV and send that back
        // TODO - This is a hack. Tests should provide the right environment.
        const el = document.createElement('div');
        el.id = id;
        document.body.appendChild(el);
        return [<HTMLElement>(<unknown>el)];
    }
    return [];
    // throw new Error(`Element with class ${id} not found!`);
};
