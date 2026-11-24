type Leaf = { kind?: 'item'; id: string; route?: string; label: string; position?: number };
type Group = { kind: 'group'; id: string; label: string; position?: number; children: Leaf[] };
type Node = Leaf | Group;
export type Layout = { sidebar: Node[]; [key: string]: unknown };

/**
 * One crouton sidebar for every service: the gateway's own items stay top level; each service becomes a group
 * whose leaves are prefixed `<svc>.<id>` (unique app URL) and `<svc>/<route>` (schema fetch goes through the
 * gateway proxy at /<svc>/*). Service groups are flattened: crouton sidebars cannot nest groups.
 */
export const mergeLayouts = (
  own: Layout,
  services: { name: string; title: string; layout: Layout }[],
): Layout => ({
  ...own,
  sidebar: [
    ...own.sidebar,
    ...services
      .map(({ name, title, layout }, i): Group => ({
        kind: 'group',
        id: name,
        label: title,
        position: 1000 + i,
        children: layout.sidebar
          .flatMap((n) => (n.kind === 'group' ? n.children : [n]))
          .map((leaf) => ({ ...leaf, id: `${name}.${leaf.id}`, route: `${name}/${leaf.route ?? leaf.id}` })),
      }))
      .filter((g) => g.children.length > 0),
  ],
});
