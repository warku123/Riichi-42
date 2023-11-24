def list_all_players(collection):
    """
    列出MongoDB集合中的所有玩家的名字。

    :param collection: MongoDB集合对象。
    :return: 包含所有玩家名字的列表。
    """
    # 查询条件是空的，表示选择所有文档
    # 投影操作仅包括玩家的名字字段
    player_documents = collection.find({}, {'_id': 0, 'name': 1})

    # 提取并返回所有玩家的名字
    return [player_doc['name'] for player_doc in player_documents]

def get_player_total_score(collection, player_name, season):
    """
    获取特定玩家在指定赛季的总分。

    :param collection: MongoDB集合对象。
    :param player_name: 玩家的名字。
    :param season: 赛季。
    :return: 玩家的总分，如果玩家不存在或赛季信息不存在则返回None。
    """
    # 构建查询条件
    query = {"name": player_name}
    # 构建投影操作，只返回所需的赛季总分
    projection = {"_id": 0, f"season_scores.{season}": 1}

    # 执行查询
    result = collection.find_one(query, projection)

    # 返回总分
    return result['season_scores'][season] if result and 'season_scores' in result and season in result['season_scores'] else None