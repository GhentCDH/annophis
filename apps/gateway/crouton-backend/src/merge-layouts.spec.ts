import { describe, expect, it } from 'vitest';

import { mergeLayouts } from './merge-layouts';

const own = { title: 'Annophis', sidebar: [{ kind: 'item' as const, id: 'setting', label: 'Settings' }] };

describe('mergeLayouts', () => {
  it('keeps the gateway items and adds one prefixed group per service', () => {
    const merged = mergeLayouts(own, [
      {
        name: 'ms-projects',
        title: 'Projects',
        layout: {
          sidebar: [
            { kind: 'item', id: 'project', route: 'projects', label: 'Project' },
            { kind: 'group', id: 'meta', label: 'Meta', children: [{ kind: 'item', id: 'tag', label: 'Tag' }] },
          ],
        },
      },
    ]);
    expect(merged.title).toBe('Annophis');
    expect(merged.sidebar).toEqual([
      own.sidebar[0],
      {
        kind: 'group',
        id: 'ms-projects',
        label: 'Projects',
        position: 1000,
        children: [
          { kind: 'item', id: 'ms-projects.project', route: 'ms-projects/projects', label: 'Project' },
          { kind: 'item', id: 'ms-projects.tag', route: 'ms-projects/tag', label: 'Tag' },
        ],
      },
    ]);
  });

  it('drops services without visible resources', () => {
    expect(mergeLayouts(own, [{ name: 'ml-adapter', title: 'ML', layout: { sidebar: [] } }]).sidebar).toEqual(
      own.sidebar,
    );
  });
});
