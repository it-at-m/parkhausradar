# For documentation see https://github.com/sclorg/s2i-python-container
# The collector has no runtime dependencies, so the image needs neither uv nor downloads besides this base image
FROM registry.access.redhat.com/ubi10/python-314-minimal:10.2-1792864274@sha256:b852370b7c31f60097668edd96be27522c63715eefe5770890c796c4251c25de

COPY *.py garages.json ./

CMD ["python3", "-u", "main.py"]
