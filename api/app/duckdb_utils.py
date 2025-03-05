import os

import duckdb


def setup_duckdb_connection():
    """Set up a DuckDB connection with necessary extensions and S3 credentials."""
    con = duckdb.connect()
    con.install_extension("spatial")
    con.load_extension("spatial")
    con.install_extension("httpfs")
    con.load_extension("httpfs")

    con.sql(
        f"""
            CREATE SECRET secret2 (
                TYPE S3,
                KEY_ID '{os.environ["VECTOR_STORE_ACCESS_KEY_ID"]}',
                SECRET '{os.environ["VECTOR_STORE_SECRET_ACCESS_KEY"]}',
                {f"SESSION_TOKEN '{os.environ['VECTOR_STORE_SESSION_TOKEN']}'," if os.environ.get("VECTOR_STORE_SESSION_TOKEN") else ""}
                REGION '{os.environ["VECTOR_STORE_DEFAULT_REGION"]}'
            );
        """
    )

    return con
