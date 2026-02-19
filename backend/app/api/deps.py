# _*_ coding : utf-8 _*_
# @Time : 2026/1/24 21:44
# @Author : Yoln
# @File : deps
# @Project : mahjong-handle-web
from __future__ import annotations

import logging

from app.modules.handle.repo import create_handle_repo_from_env
from app.modules.link.repo import create_link_repo_from_env
from app.modules.battle.repo import create_battle_repo_from_env

# NOTE: keep single repo instances for the whole process.
handle_repo = create_handle_repo_from_env()
link_repo = create_link_repo_from_env()
battle_repo = create_battle_repo_from_env()

log = logging.getLogger("mahjong.api")
