# _*_ coding : utf-8 _*_
# @Time : 2026/1/24 21:44
# @Author : Yoln
# @File : deps
# @Project : mahjong-handle-web
from __future__ import annotations

import logging

from app.modules.handle.repo import create_handle_repo_from_env
from app.modules.llk.repo import create_llk_repo_from_env

# NOTE: keep single repo instances for the whole process.
handle_repo = create_handle_repo_from_env()
llk_repo = create_llk_repo_from_env()

log = logging.getLogger("mahjong.api")
