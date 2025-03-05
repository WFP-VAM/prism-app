import os

import duckdb


def setup_duckdb_connection():
    """Set up a DuckDB connection with necessary extensions and S3 credentials."""
    con = duckdb.connect()
    con.install_extension("spatial")
    con.load_extension("spatial")
    con.install_extension("httpfs")
    con.load_extension("httpfs")
    # Set up S3 credentials using CREATE SECRET with session token support
    con.sql(
        f"""
        CREATE SECRET secret2 (
            TYPE S3,
            KEY_ID '{os.environ["AWS_ACCESS_KEY_ID"]}',
            SECRET '{os.environ["AWS_SECRET_ACCESS_KEY"]}',
            {f"SESSION_TOKEN '{os.environ['AWS_SESSION_TOKEN']}'" if os.environ.get("AWS_SESSION_TOKEN") else ""},
            {f"REGION '{os.environ['AWS_DEFAULT_REGION']}'" if os.environ.get("AWS_DEFAULT_REGION") else ""}
        );
        """
    )
    return con
