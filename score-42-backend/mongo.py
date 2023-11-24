from pymongo import MongoClient

def CreateLeagueDB(url, dbname):
    '''
    创建一个数据库查询对象
    
    :param url: 数据库的url
    :param dbname: 数据库的名字
    :return: 数据库查询对象
    '''
    client = MongoClient(url)
    db = client[dbname]
    return db

def CreateCollection(db, collection_name):
    '''
    创建一个集合查询对象
    
    :param db: 数据库查询对象
    :param collection_name: 集合的名字
    :return: 集合查询对象
    '''
    collection = db[collection_name]
    return collection

