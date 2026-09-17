"""initial

Revision ID: 0001
Revises:
Create Date: 2026-09-17

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "recognitions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("plate_text", sa.String(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("original_image_url", sa.String(), nullable=False),
        sa.Column("processed_image_url", sa.String(), nullable=True),
        sa.Column("detected_bbox", sa.JSON(), nullable=True),
        sa.Column("processing_time_ms", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("error_message", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_recognitions_created_at", "recognitions", ["created_at"])
    op.create_index("ix_recognitions_status", "recognitions", ["status"])


def downgrade() -> None:
    op.drop_index("ix_recognitions_status", table_name="recognitions")
    op.drop_index("ix_recognitions_created_at", table_name="recognitions")
    op.drop_table("recognitions")
