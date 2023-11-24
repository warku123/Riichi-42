from flask import Flask, jsonify, request
from pymongo import MongoClient
from match import *
from player import *

app = Flask(__name__)

# MongoDB设置
client = MongoClient('mongodb://8.130.67.151:27017/')
db = client['mahjong_league']
matches_collection = db['mahjong_matches']
players_collection = db['players']
counter_collection = db['counter']

# 列出所有玩家
@app.route('/players', methods=['GET'])
def list_players():
    players = list_all_players(players_collection)
    return jsonify(players)

# 获取某个玩家的总分
@app.route('/player/score', methods=['GET'])
def player_score():
    player_name = request.args.get('name')
    season = request.args.get('season')
    score = get_player_total_score(players_collection, player_name, season)
    return jsonify({"name": player_name, "season": season, "total_score": score})

# 插入一场比赛的分数
@app.route('/match/insert', methods=['POST'])
def insert_match():
    match_data = request.json
    input_match_scores(matches_collection, players_collection, match_data['date'], match_data['season'], match_data['scores'])
    return jsonify({"status": "success", "message": "Match data inserted successfully"})

# 删除一场比赛的分数
@app.route('/match/delete', methods=['POST'])
def delete_match():
    match_data = request.json
    delete_match_and_update_players(matches_collection, players_collection, match_data['date'], match_data['id'], match_data['season'])
    return jsonify({"status": "success", "message": "Match data deleted successfully"})

# 获取某个赛季的所有比赛
@app.route('/matches/<season>', methods=['GET'])
def matches_of_a_season(season):
    matches = get_matches_of_season(matches_collection, season)
    return jsonify(matches)

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8000, debug=True)
