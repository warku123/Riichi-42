def get_next_match_id(counters_collection, date):
    """
    获取给定日期的下一个比赛ID。

    :param counters_collection: 存储计数器的MongoDB集合。
    :param date: 指定的日期。
    :return: 当日的自增比赛ID。
    """
    # 更新计数器并返回新值
    result = counters_collection.find_one_and_update(
        {"date": date},
        {"$inc": {"count": 1}},
        upsert=True,
        return_document=True
    )

    return result["count"]

def input_match_scores(matches_collection, counters_collection, players_collection, match_date, season, scores):
    """
    输入一场麻将比赛的分数并更新玩家总分。

    :param matches_collection: 比赛记录的MongoDB集合。
    :param counters_collection: 存储计数器的MongoDB集合。
    :param players_collection: 玩家信息的MongoDB集合。
    :param match_date: 比赛日期。
    :param season: 所属赛季。
    :param scores: 玩家得分列表，格式为 [{'name': 玩家名, 'score': 得分}, ...]。
    """
    match_id = get_next_match_id(counters_collection, match_date)
    
    # 构建比赛记录文档
    match_document = {
        "match_date": match_date,
        "match_id": match_id,
        "season": season,
        "scores": scores
    }

    # 插入比赛记录
    matches_collection.insert_one(match_document)

    # 更新每位玩家的赛季总分
    for score_entry in scores:
        player_name = score_entry['name']
        player_score = score_entry['score']

        players_collection.update_one(
            {"name": player_name},
            {"$inc": {f"season_scores.{season}": player_score}},
            upsert=True
        )

def get_matches_of_season(matches_collection, season):
    """
    获取某个赛季所有比赛的详细信息。

    :param matches_collection: 比赛记录的MongoDB集合。
    :param season: 所查询的赛季。
    :return: 该赛季所有比赛的详细信息列表。
    """
    # 查询条件：根据赛季筛选
    query = {"season": season}

    # 执行查询
    matches = matches_collection.find(query)

    # 返回查询结果
    return list(matches)

def delete_match_and_update_players(matches_collection, players_collection, match_date, match_id, season):
    """
    根据日期和比赛ID删除比赛记录，并更新相关玩家的得分。

    :param matches_collection: 比赛记录的MongoDB集合。
    :param players_collection: 玩家信息的MongoDB集合。
    :param match_date: 比赛日期。
    :param match_id: 当日的比赛ID。
    :param season: 赛季。
    """
    # 定位并删除比赛记录
    match = matches_collection.find_one_and_delete({"match_date": match_date, "match_id": match_id})

    # 如果找到并删除了比赛记录，更新相关玩家的得分
    if match:
        for player_score in match['scores']:
            player_name = player_score['name']
            score_to_deduct = player_score['score']

            # 从玩家的赛季总分中减去相应得分
            players_collection.update_one(
                {"name": player_name},
                {"$inc": {f"season_scores.{season}": -score_to_deduct}}
            )
