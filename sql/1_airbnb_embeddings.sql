CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE airbnb_listing
    ADD COLUMN description_embedding vector(1536);

CREATE INDEX NONCONCURRENTLY ON airbnb_listing USING ybhnsw (description_embedding vector_cosine_ops);
