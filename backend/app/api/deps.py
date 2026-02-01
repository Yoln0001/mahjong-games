# _*_ coding : utf-8 _*_
# @Time : 2026/1/24 21:44
# @Author : Yoln
# @File : deps
# @Project : mahjong-handle-web
from __future__ import annotations

import logging

from ..repo import create_repo_from_env

# NOTE: keep a single repo instance for the whole process.
# If you later need per-request lifecycle, replace this with FastAPI dependencies.
repo = create_repo_from_env()

log = logging.getLogger("mahjong.api")
