
exports.CatAbonents = class CatAbonents extends Object {

  db(cachable) {
    const {job_prm: {server}, adapters: {pouch}} = this._manager._owner.$p;
    return server.abonents.length < 2 ? pouch.remote[cachable] : this.server.db(this, cachable);
  }
};
