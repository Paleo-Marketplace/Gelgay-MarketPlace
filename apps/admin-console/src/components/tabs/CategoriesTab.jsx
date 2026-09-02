import React from 'react';

export function CategoriesTab({
  categories,
  newCategory,
  onChangeNewCategory,
  onCreateCategory,
  onDeleteCategory
}) {
  return (
    <div className="columns">
      <section className="panel">
        <h2>Active Categories ({categories.length})</h2>
        <div className="list">
          {categories.map((c) => (
            <article className="item" key={c._id}>
              <div>
                <strong>{c.name} ({c.slug})</strong>
                <span>Tag: {c.tag} · {c.description}</span>
              </div>
              <div className="actions">
                <button className="danger" type="button" onClick={() => onDeleteCategory(c._id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Add New Category</h2>
        <form onSubmit={onCreateCategory} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            required
            placeholder="Category Name (e.g. Modern Ceramics)"
            value={newCategory.name}
            onChange={(e) => onChangeNewCategory({ ...newCategory, name: e.target.value })}
            style={{ padding: 8, background: '#1c1c1a', border: '1px solid #333', color: '#fff', borderRadius: 6 }}
          />
          <input
            type="text"
            required
            placeholder="Slug (e.g. ceramics)"
            value={newCategory.slug}
            onChange={(e) => onChangeNewCategory({ ...newCategory, slug: e.target.value })}
            style={{ padding: 8, background: '#1c1c1a', border: '1px solid #333', color: '#fff', borderRadius: 6 }}
          />
          <input
            type="text"
            placeholder="Tag (e.g. 06 / CERAMICS)"
            value={newCategory.tag}
            onChange={(e) => onChangeNewCategory({ ...newCategory, tag: e.target.value })}
            style={{ padding: 8, background: '#1c1c1a', border: '1px solid #333', color: '#fff', borderRadius: 6 }}
          />
          <button className="primary" type="submit">
            Create Category
          </button>
        </form>
      </section>
    </div>
  );
}
