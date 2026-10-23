FROM registry.access.redhat.com/ubi10/ubi-minimal:10.2-1792742351@sha256:ab67cd02caf8706e34a695a1432ebe965934f6128ec352a6c3f4048b43a4fb5e

COPY --from=ghcr.io/astral-sh/uv:0.13.5@sha256:32a7bb39b496babbd997b0a39a4d66c126bdaf5661b302bf6f06abda8deca6ff /uv /uvx /bin/

# Python is installed outside of /root so that the random UID of OpenShift can run it
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_PREFERENCE=only-managed \
    UV_PYTHON_INSTALL_DIR=/opt/python

WORKDIR /app

COPY pyproject.toml uv.lock .python-version ./

# Permissions are set in the same layer, a separate layer would duplicate the Python installation
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-dev --locked && \
    chmod -R g=u /app /opt/python

COPY *.py garages.json ./

ENV PATH="/app/.venv/bin:$PATH"

CMD ["python", "-u", "main.py"]
